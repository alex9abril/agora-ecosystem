Dominio: https://backend-staging.karlopay.com
Endpoint login: https://backend-staging.karlopay.com/api/auth/login
Endpoint creación y/o actualización ordenes: https://backend-staging.karlopay.com/api/orders/create-or-update
Credenciales:
{
email": "ecommerce.agora+stg@karlo.io",
"password": "XSy3EZW%yF0",
}
Ejemplo de payload que hoy nos envia ballena:
{
  "businessArea": "ventas",
  "numberOfOrder": "payses_01JJD1VWT2ESR3101A9Q3TMN5V",
  "status": "R",
  "total": 502.48,
  "customer": {
    "foreignId": "cus_01JFTXQQ1PA3DQ9355DJDNHG6N",
    "fullName": "Alonso Avila",
    "phoneNumber": "1234567890",
    "email": "avila.dsg@gmail.com",
    "invoiceProfile": null
  },
  "operations": [
    {
      "description": "Producto 1",
      "quantity": 1,
      "price": 0.01
    },
    {
      "description": "Producto 2",
      "quantity": 2,
      "price": 575.69
    }
  ],
  "product": null,
  "redirectUrl": "http://localhost:8000#/karlopay-redirect?session_id=payses_01JJD1VWT2ESR3101A9Q3TMN5V",
  "additional": { "session_id": "payses_01JJD1VWT2ESR3101A9Q3TMN5V" }
}
Ejemplo de la respuesta que le damos, dentro de ella viene el campo urlPayment lo cual usan ellos para el redirect a nuestra landing de pagos
{
  "createdAt": "2025-01-24T15:00:42",
  "updatedAt": "2025-01-24T15:00:42",
  "urlFileXml": null,
  "id": 6592,
  "businessId": 78,
  "adviserId": null,
  "customerId": 2667,
  "catalogBusinessAreaId": null,
  "adviserName": null,
  "adviserPhoneNumber": null,
  "adviserEmail": null,
  "numberOfOrder": "PAYSES_01JJD1VWT2ESR3101A9Q3TMN5V",
  "status": "remission",
  "subTotal": 433.17,
  "iva": 69.31,
  "total": 502.48,
  "hasProvisionalPayment": false,
  "additional": null,
  "invoiceDate": null,
  "invoiceNumber": null,
  "urlPayment": "short.karlo.io/get?id=2ec41db8-2919-4fb3-9637-743fc6d72027",
  "redirectUrl": null,
  "createdDate": "2025-01-24T21:00:42.000Z",
  "fromCreated": "ws",
  "isClosedInDMS": true,
  "serialNumber": "",
  "product": null,
  "businessArea": "ventas",
  "fileName": null,
  "statusInvoice": "no invoice",
  "typeOrder": null,
  "urlFile": null,
  "paymentedAt": null,
  "deletedAt": null,
  "invoiceReason": null,
  "subStatus": null
}
Así como el ejemplo de payload que les hacemos llegar en la confirmación del pago del cliente, quedo pendiente de tu servicio para hacértelo llegar así como si requiriera login o no
{
  "numberOfOrder": "PAYSES_01JJDAGRA4BTP8SHV4ETGEVG9V",
  "cardType": "CREDIT VISA",
  "paymentDate": "2025-01-24T17:32:40",
  "cardDC": "visa",
  "bankName": "n/a",
  "bankCode": "999",
  "referenceNumber": "84607756130",
  "cardHolder": "F f",
  "postalCode": "45130",
  "meses": 0,
  "paymentMethod": "PUE",
  "paymentForm": "04",
  "promotion": false,
  "lastFour": "494133******5344",
  "additional": {
    "session_id": "payses_01JJDAGRA4BTP8SHV4ETGEVG9V"
  },
  "taxData": {
    "socialReason": "",
    "postalCodeTax": "45130",
    "RFC": "XAXX010101000",
    "taxRegime": "616",
    "CFDI": "S01",
    "email": "avila.dsg@gmail.com"
  },
  "paymentInformation": {
    "percentageBaseComission": 0.035,
    "percentageBaseSurcharge": 0,
    "commissions": {
      "baseComission": 16.97,
      "baseComissionIva": 2.72,
      "baseComissionTotal": 19.69
    },
    "surcharges": {
      "baseSurcharge": 0,
      "baseSurchargeIva": 0,
      "baseSurchargeTotal": 0
    },
    "originalAmount": 484.86,
    "totalCommissionForTerminalUse": 0,
    "totalCommissionForDeferringToMonths": 0,
    "totalCommissionToCustomer": 0,
    "totalCommissionToBusiness": 19.69,
    "totalToDepositBusiness": 465.17,
    "totalPaymentPerMonth": 484.86,
    "totalPayment": 484.86
  }
}