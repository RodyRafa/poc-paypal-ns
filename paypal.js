let router = require('express').Router();
let request = require('request');

router.post('/paypal/create-payment', function (req, res, next) {
    console.log("create-payment");

    console.log(req.query);

    var valor = req.query.value;

    performRequest({
        url: 'https://api.sandbox.paypal.com/v1/payments/payment',
        method: 'post',
        body: {
            "intent": "order",
            "redirect_urls":
            {
                "return_url": "http://localhost:5000/confirm-payment",
                "cancel_url": "http://localhost:5000"
            },
            "payer":
            {
                "payment_method": "paypal"
            },
            "experience_profile_id": "XP-FNF4-5Q64-ULDA-2R6L",
            "transactions": [{
                "amount":
                {
                    "total": valor,
                    "currency": "MXN"
                },
                "description": "Order",
                "payment_options": {
                    "allowed_payment_method": "IMMEDIATE_PAY"
                },
                "item_list": {
                    "shipping_address": {
                        "recipient_name": "Rodrigo De Presbiteris",
                        "line1": "Rua Teste 2000",
                        "city": "São Paulo",
                        "state": "SP",
                        "postal_code": "04206-002",
                        "country_code": "BR"
                    }
                }
            }]
        },
        json: true
    }, function (error, response, body) {
        console.log("create-payment", error, response.statusCode, body);

        res.json({
            paymentID: body.id
        });
    });
});

router.post('/paypal/execute-payment', function (req, res, next) {
    console.log("execute-payment");

    var paymentId = req.body.paymentID;
    var payerId = req.body.payerID;
    var ecToken = req.body.paymentToken;

    performRequest({
        url: `https://api.sandbox.paypal.com/v1/payments/payment/${paymentId}/execute/`,
        method: 'post',
        body: {
            "payer_id": payerId
        },
        json: true
    }, function (error, response, body) {
        console.log("execute-payment", error, response.statusCode, body);

        res.json({
            paymentID: paymentId,
            ecToken: ecToken,
            payer: body.payer
        });
    });
});

var performRequest = function (options, cb) {
    request.post({
        url: 'https://api.sandbox.paypal.com/v1/oauth2/token',
        headers: {
            'Authorization': 'Basic QVZtTEN1TVpNX2dtdnhpbVc3dVFVQktFazhST1BXWXoxV2dJTGdscnhvN01IQ2wwbWxJSHlmc3ZqV3lHMnc5OEpOTzNzVE82NEx6eDA0VE06RURaanpOalpQcUpUbjl1S08xS0pTT28zVzJUM1FvZW9scnJpRzlmV0NoTXBMM3VKUzEtTmVZejVJZjZRLWt1c01vcmRnS29XTVBnVUNqWHY=',
            'content-type': 'content-type',
            'accept-language': 'en_US',
            'accept': 'application/json'
        },
        form: { grant_type: 'client_credentials' }
    }, function (error, response, body) {
        console.log("bearer", error, body);
        var bearer = JSON.parse(body).access_token;

        options.headers = { Authorization: 'Bearer ' + bearer };
        request(options, cb);
    });
}

module.exports = router;
