const axios = require("axios");

const API_URL = "https://smmapi.example.com";
const API_KEY = "YOUR_API_KEY";

async function createOrder(service, link, quantity) {
    const res = await axios.post(API_URL, {
        key: API_KEY,
        action: "add",
        service,
        link,
        quantity
    });

    return res.data;
}

module.exports = { createOrder };