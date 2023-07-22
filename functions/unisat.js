const axios = require('axios')

exports.handler = async (event) => {
  const { path } = event
  const { name } = event.queryStringParameters

  try {
    const res = await axios.get(
      path.replace('/.netlify/functions/unisat', 'https://unisat.io'),
      {
        params: {
          name,
          limit: 32,
          start: 0,
        },
      }
    )

    const { data } = res.data

    return {
      statusCode: 200,
      body: JSON.stringify({ data }),
    }
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ msg: err.message }),
    }
  }
}
