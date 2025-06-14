exports.handler = async (event) => {
  return {
    statusCode: 200,
    body: JSON.stringify({ message: "AirCare Lambda is working!" }),
  };
};
