const express = require('express');
const paypal = require('paypal-rest-sdk');
const axios = require('axios');
paypal.configure({
  'mode': 'sandbox',
  'client_id': Process.env.CLIENT_ID,
  'client_secret': Proces.env.CLIENT_SECRET
});


const app = express();

app.set('view engine', 'ejs');

app.get('/', (req, res) => res.render('index'));

app.post('/pay', async (req, res) => {
  let obj = {
    name: "devashish"
  }
  const create_payment_json = {
    "intent": "sale",
    "payer": {
      "payment_method": "paypal"
    },
    "redirect_urls": {
      "return_url": "http://localhost:3000/success",
      "cancel_url": "http://localhost:3000/cancel"
    },
    "transactions": [{
      "item_list": {
        "items": [{
          "name": "Red Sox Hat",
          "sku": "001",
          "price": "25.00",
          "currency": "USD",
          "quantity": 1,
        }]
      },
      "amount": {
        "currency": "USD",
        "total": "25.00"
      },
      "description": JSON.stringify(obj),
    }]
  };

  const transaction = await _createPay(create_payment_json);
  for (let i = 0; i < transaction.links.length; i++) {
    if (transaction.links[i].rel === 'approval_url') {
      res.redirect(transaction.links[i].href);
    }
  }
});

const _createPay = (payment) => {
  return new Promise((resolve, reject) => {
    paypal.payment.create(payment, (err, payment) => err ? reject(err) : resolve(payment));
  });
}

const _executePay = (paymentId, execute_payment_json) => {
  return new Promise((resolve, reject) => {
    console.log(paymentId, execute_payment_json);
    paypal.payment.execute(paymentId, execute_payment_json, (error, payment) => {
      return error ? reject(error) : resolve(JSON.stringify(payment));
    })
  })
}


app.get('/success', async (req, res) => {
  const payerId = req.query.PayerID;
  const paymentId = req.query.paymentId;
  const params = new URLSearchParams();
  params.append('grant_type', 'client_credentials');
  let config = {
    headers: {
      Authorization: Process.env.BASIC_AUTH,
    }
  }
  let data;
  try {
    data = await axios.post('https://api.sandbox.paypal.com/v1/oauth2/token', params, config);
    console.log("data", data);
  } catch (error) {
    console.log("error", error);
  }
  let paymentHeader = {
    headers: {
      Authorization: `Bearer ${data.data.access_token}`,
    }
  }

  let paymentOption = await axios.get(`https://api.sandbox.paypal.com/v1/payments/payment/${paymentId}`, paymentHeader);
  const execute_payment_json = {
    "payer_id": payerId,
    "transactions": [{
      "amount": {
        "currency": "USD",
        "total": paymentOption.data.transactions[0].amount.total
      }
    }]
  };


  try {
    const execute = await _executePay(paymentId, execute_payment_json);
    let parseObject = JSON.parse(execute);
    res.send('Success', { paymentId: parseObject.id });
  } catch (error) {
    console.log(error, "error");
  }
});



app.get('/cancel', (req, res) => res.send('Cancelled'));

app.listen(3000, () => console.log('Server Started'));