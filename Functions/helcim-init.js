/**
 * Netlify Function: helcim-init
 * -----------------------------
 * Initializes a HelcimPay.js checkout session server-side.
 * Called from the registration form on the landing page.
 *
 * Your Helcim API token is stored as a Netlify environment variable
 * (HELCIM_API_TOKEN) and never exposed in front-end code.
 *
 * Endpoint: /.netlify/functions/helcim-init
 * Method: POST
 * Returns: { checkoutToken, secretToken } on success
 */

exports.handler = async function (event) {

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  const apiToken = process.env.HELCIM_API_TOKEN;

  if (!apiToken) {
    console.error('HELCIM_API_TOKEN environment variable is not set');
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Payment configuration error. Please contact info@integratedairwayinstitute.com.' })
    };
  }

  try {
    const response = await fetch('https://api.helcim.com/v2/helcim-pay/initialize', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-token': apiToken,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        paymentType: 'purchase',
        amount: 6100.00,
        currency: 'USD',
        paymentMethod: 'cc-ach',
        allowExit: true,
        confirmationScreen: true
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Helcim API error:', data);
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: 'Unable to initialize payment. Please try again or contact info@integratedairwayinstitute.com.' })
      };
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': 'https://integratedairwayinstitute.com'
      },
      body: JSON.stringify({
        checkoutToken: data.checkoutToken,
        secretToken: data.secretToken
      })
    };

  } catch (err) {
    console.error('Function error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Something went wrong. Please contact info@integratedairwayinstitute.com.' })
    };
  }
};
