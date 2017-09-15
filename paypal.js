let router = require('express').Router();
let request = require('request');
let queryString = require('query-string');
let _ = require('underscore');

// PRESBA
let paypalRestBasicAuth = 'Basic QWNPeG84OVhWMkRwT1RqYU83dTVPOTA1N0kzVFBOa0JRbzVfVENnVUpmZEstaFpzLUVXaGZoMW01U0ZHRWZyQzhWUHAzckhYb1E4b205RTE6RUFXbjM5V3hNZ25EQ0ZXX1BFOURkekU1STQ5SEw4cW9IMThkRTZjemdad2ZZcW04Si1EMnJoSnMyM2pRV1FPbWJraXlXWlVKUWEydjVoUEQ=';
let paypalKeys = {
     "USER": "rpresb-facilitator-mx_api1.gmail.com",
     "PWD": "87JXX3EGC47Z2RWE",
     "SIGNATURE": "AFcWxV21C7fd0v3bYYYRCpSSRl31A.UPKPM1mHJAroYgTFxSxnEdgNy1"
};

var bearer;
var bearerDate;

router.post('/paypal/create-payment', function (req, res, next) {
    console.log("create-payment");

    setExpressCheckout(function (data) {
        console.log(data);
        res.json(data);
    });

});

router.post('/paypal/billing-agreement', function (req, res, next) {
    console.log("billing-agreement");

    createBillingAgreement(req.body.paymentToken, function (ba_data) {
        console.log(ba_data);

        getExpressCheckoutDetails(req.body.paymentToken, function (ec_data) {
            console.log("getExpressCheckoutDetails", ec_data);

            res.json(_.extend(ba_data, ec_data));
        });
    });

});

router.post('/paypal/installments', function (req, res, next) {
    console.log("installments");

    calculatedFinancingOptionsRest(req.body.value, req.body.baId, function (data, statusCode) {
        res.status(statusCode).json(data);
    });

});

router.post('/paypal/execute-payment', function (req, res, next) {
    console.log("execute-payment");

    var value = req.body.value;
    var baId = req.body.baId;
    var term = req.body.term;
    var term_value = req.body.term_value;
    var currency = req.body.currency;

    createPaymentRest(baId, value, term, term_value, currency, function (data, statusCode) {
        res.status(statusCode).json(data);
    });
});

var doRequestWithBearer = function (options, cb) {
    options.headers = { Authorization: 'Bearer ' + bearer };
    request(options, cb);
}

var performRequest = function (options, cb) {
    if (!bearer || bearerDate < new Date()) {
        console.log('Acquiring bearer');

        request.post({
            url: 'https://api.sandbox.paypal.com/v1/oauth2/token',
            headers: {
                'Authorization': paypalRestBasicAuth,
                'content-type': 'content-type',
                'accept-language': 'en_US',
                'accept': 'application/json'
            },
            form: { grant_type: 'client_credentials' }
        }, function (error, response, body) {
            console.log("bearer", error, body);

            bearer = JSON.parse(body).access_token;
            bearerDate = new Date();
            bearerDate.setSeconds(bearerDate.getSeconds() + parseInt(JSON.parse(body).expires_in) / 2);

            console.log("bearer", bearer, bearerDate);

            doRequestWithBearer(options, cb);
        });
    } else {
        return doRequestWithBearer(options, cb);
    }
};

var setExpressCheckout = function (cb) {

    performNVPRequest({
        "VERSION": "204.0",
        "METHOD": "SetExpressCheckout",
        "RETURNURL": "http://localhost:8080/return.html",
        "CANCELURL": "http://localhost:8080/cancel.html",
        "PAYMENTREQUEST_0_AMT": "0.00",
        "PAYMENTREQUEST_0_CURRENCYCODE": "MXN",
        "PAYMENTREQUEST_0_PAYMENTACTION": "Sale",
        "LOCALECODE": "es_XC",
        "NOSHIPPING": "1",
        "L_BILLINGTYPE0": "MerchantInitiatedBillingSingleAgreement",
        "L_BILLINGAGREEMENTDESCRIPTION0": "Vincular mi cuenta con Netshoes",
        "PAYMENTREQUEST_0_SHIPTONAME": "Nome Recebedor",
        "PAYMENTREQUEST_0_SHIPTOSTREET": "Gregorio Rolim de Oliveira, 42",
        "PAYMENTREQUEST_0_SHIPTOSTREET2": "JD Serrano II",
        "PAYMENTREQUEST_0_SHIPTOCITY": "Votorantim",
        "PAYMENTREQUEST_0_SHIPTOSTATE": "DGO",
        "PAYMENTREQUEST_0_SHIPTOZIP": "18117-134",
        "PAYMENTREQUEST_0_SHIPTOCOUNTRYCODE": "MX"
    }, function (error, response, body) {
        var json = queryString.parse(body);
        console.log('SetExpressCheckout', body, json);
        cb({
            token: json.TOKEN
        });
    });
};

var createBillingAgreement = function (token, cb) {

    performNVPRequest({
        "VERSION": "204.0",
        "METHOD": "CreateBillingAgreement",
        "TOKEN": token
    }, function (error, response, body) {
        var json = queryString.parse(body);
        console.log('CreateBillingAgreement', body, json);
        cb({
            billingAgreementId: json.BILLINGAGREEMENTID
        });
    });
};

var getExpressCheckoutDetails = function (token, cb) {

    performNVPRequest({
        "VERSION": "204.0",
        "METHOD": "GetExpressCheckoutDetails",
        "TOKEN": token
    }, function (error, response, body) {
        var json = queryString.parse(body);
        console.log('GetExpressCheckoutDetails', body, json);
        cb({
            token: json.TOKEN,
            payer: {
                payerId: json.PAYERID,
                email: json.EMAIL
            }
        });
    });
};

var performNVPRequest = function (form, cb) {

    var formData = _.extend(form, paypalKeys);

    console.log("==========================");
    console.log("request data", formData);
    console.log("==========================");

    request({
        "async": false,
        "crossDomain": true,
        "url": "https://api-3t.sandbox.paypal.com/nvp",
        "method": "POST",
        "cache-control": "no-cache",
        "headers": {
            "content-type": "application/x-www-form-urlencoded"
        },
        "form": formData
    }, cb);

}

var createPaymentRest = function (baId, value, term, term_value, currency, cb) {
    performRequest({
        url: 'https://api.sandbox.paypal.com/v1/payments/payment',
        method: 'post',
        body: {
            "intent": "sale",
            "redirect_urls": {
                "return_url": "http://localhost:5000/confirm-payment",
                "cancel_url": "http://localhost:5000"
            },
            "payer": {
                "payment_method": "paypal",
                "funding_instruments": [
                    {
                        "billing": {
                            "billing_agreement_id": baId,
                            "selected_installment_option": {
                                "term": term,
                                "monthly_payment": {
                                    "value": term_value,
                                    "currency": currency
                                }
                            }
                        }
                    }
                ]
            },
            "transactions": [{
                "amount": {
                    "currency": currency,
                    "total": value
                },
                "description": "This is the payment transaction description",
                "custom": "custom123",
                "payment_options": {
                    "allowed_payment_method": "IMMEDIATE_PAY"
                },
                "item_list": {
                    "shipping_address": {
                        "recipient_name": "Nome Recebedor",
                        "line1": "Avenida Paulista, 1048",
                        "line2": "Bela Vista",
                        "city": "Sao Paulo",
                        "country_code": "BR",
                        "postal_code": "01310-100",
                        "state": "Sao Paulo",
                        "phone": "911111111"
                    },
                    "items": [{
                        "name": "Item Name",
                        "description": "Item Description",
                        "quantity": "1",
                        "price": "10.00",
                        "sku": "Item123",
                        "currency": currency
                    }]
                }
            }],
        },
        json: true
    }, function (error, response, body) {
        console.log("create-payment", error, response.statusCode, JSON.stringify(body));

        var transactionID = body.transactions[0].related_resources[0].sale.id;

        cb({
            paymentID: body.id,
            transactionID: transactionID,
            state: body.state
        }, response.statusCode);
    });
}

var calculatedFinancingOptionsRest = function (value, baId, cb) {
    performRequest({
        url: 'https://api.sandbox.paypal.com/v1/credit/calculated-financing-options',
        method: 'post',
        body: {
            "financing_country_code": "MX",
            "transaction_amount": {
                "value": value,
                "currency_code": "MXN"
            },
            "funding_instrument": {
                "type": "BILLING_AGREEMENT",
                "billing_agreement": {
                    "billing_agreement_id": baId
                }
            }
        },
        json: true
    }, function (error, response, body) {
        console.log("calculatedFinancingOptions", error, response.statusCode, JSON.stringify(body));

        cb(body, response.statusCode);
    });
}

module.exports = router;
