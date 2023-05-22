const downloadFile = require("../helpers/downloadData");
const xml2js = require("xml2js");

const createMetarUrl = (icao) =>
  `https://aviationweather.gov/adds/dataserver_current/httpparam?dataSource=metars&requestType=retrieve&format=xml&stationString=${icao}&mostRecent=true&hoursBeforeNow=72`;
const createAirportUrl = (icao) =>
  `https://airportdb.io/api/v1/airport/${icao}?apiToken=${process.env.AIRPORTDB_API_TOKEN}`;

const get = (value, fallback = null) => {
  return Array.isArray(value) && value[0] ? value[0] : fallback;
};

const isNumber = (value) => {
  return typeof value === "number" && !isNaN(value);
};

const isString = (value) => {
  return typeof value === "string" && value.length;
};

const runwayAPI = async (req, res) => {
  try {
    const { icao } = req.params;

    const airportUrl = createAirportUrl(icao);
    const airportDataRaw = await downloadFile(airportUrl);
    const airportData = JSON.parse(airportDataRaw);

    if (!airportData.ident) {
      return res.json({
        code: 2,
        error: `اطلاعات فرودگاه مربوطه یافت نشد`,
      });
    }
    if (!airportData.runways || !airportData.runways.length) {
      return res.json({
        code: 3,
        error: `اطلاعات نادرست است دوباره تلاش کنید`,
      });
    }

    let station = {
      icao_code: airportData.icao_code,
      distance: 0,
    };
    if (
      airportData.station &&
      airportData.station.icao_code !== airportData.icao_code
    ) {
      station = airportData.station;
    }

    const runways = airportData.runways.map((runway) => {
      return {
        width_ft: parseFloat(runway.width_ft),
        length_ft: parseFloat(runway.length_ft),
        le_ident: runway.le_ident,
        he_ident: runway.he_ident,
        he_latitude_deg: parseFloat(runway.he_latitude_deg),
        he_longitude_deg: parseFloat(runway.he_longitude_deg),
        he_heading_degT: parseFloat(runway.he_heading_degT),
        le_ils: runway.le_ils,
        he_ils: runway.he_ils,
      };
    });

    const validRunways = runways.filter((runway) => {
      return (
        isNumber(runway.width_ft) &&
        runway.width_ft > 0 &&
        isNumber(runway.length_ft) &&
        runway.length_ft > 0 &&
        isString(runway.le_ident) &&
        isString(runway.he_ident) &&
        isNumber(runway.he_latitude_deg) &&
        isNumber(runway.he_longitude_deg) &&
        isNumber(runway.he_heading_degT)
      );
    });

    if (!validRunways.length) {
      return res.json({
        code: 4,
        error: `اطلاعت وارد شده متاسفانه اشتباه می باشد`,
      });
    }

    const metarUrl = createMetarUrl(station.icao_code);

    const metarXML = await downloadFile(metarUrl);

    const parser = new xml2js.Parser();

    const parsed = (await parser.parseStringPromise(metarXML)).response;

    const rawData = parsed.data[0];
    const resultCount = parseInt(rawData.$.num_results);

    if (resultCount === 0) {
      return res.json({
        code: 1,
        error: `اطلاعت متار مربوط به این فرودگاه در دسترس نمی باشد `,
      });
    }

    const airportMetar = rawData.METAR[0];
    const rawMetar = get(airportMetar.raw_text);
    const wind_direction = parseFloat(get(airportMetar.wind_dir_degrees));
    const wind_speed = parseFloat(get(airportMetar.wind_speed_kt));
    const time = get(airportMetar.observation_time);

    res.json({
      name: airportData.name,
      metar: rawMetar,
      runways: validRunways,
      wind_direction,
      wind_speed,
      icao: icao.toUpperCase(),
      station,
      time,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).send("خطایی رخ داده است");
  }
};

module.exports = runwayAPI;
