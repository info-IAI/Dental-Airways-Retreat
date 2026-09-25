/**
 * Netlify Function: helcim-charge-balance
 * -----------------------------------------
 * Charges a previously-saved card/bank token for a split-payment balance.
 * Called by Apps Script (server-to-server), NOT from the browser, so it
 * doesn't need a CORS origin restriction the way helcim-init and
 * helcim-validate do.
 *
 * Because this endpoint can trigger a real charge, it requires a shared
 * secret rather than being open to anyone who finds the URL. Set
 * INTERNAL_TRIGGER_SECRET as a Netlify environment variable (any long
 * random string), and Apps Script must send the same value.
 *
 * Endpoint: /.netlify/functions/helcim-charge-balance
 * Method: POST
 * Body: { secret: string, cardToken: string, customerCode: string,
 *         amount: number, email: string }
 * Returns: { success: boolean, transactionId, status, error }
 */

exports.handler = async function (event) {

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  const apiToken = process.env.HELCIM_API_TOKEN;
  const internalSecret = process.env.INTERNAL_TRIGGER_SECRET;

  if (!apiToken || !internalSecret) {
    console.error('HELCIM_API_TOKEN or INTERNAL_TRIGGER_SECRET is not set');
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: 'Configuration error.' })
    };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (e) {
    return {
      statusCode: 400,
      body: JSON.stringify({ success: false, error: 'Invalid request.' })
    };
  }

  if (body.secret !== internalSecret) {
    console.error('helcim-charge-balance: invalid or missing secret');
    return {
      statusCode: 403,
      body: JSON.stringify({ success: false, error: 'Unauthorized.' })
    };
  }

  if (!body.cardToken || !body.amount) {
    return {
      statusCode: 400,
      body: JSON.stringify({ success: false, error: 'Missing cardToken or amount.' })
    };
  }

  try {
    const response = await fetch('https://api.helcim.com/v2/payment/purchase', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-token': apiToken,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        amount: body.amount,
        currency: 'USD',
        ipAddress: '0.0.0.0', // no real customer IP exists for this unattended charge
        cardData: {
          cardToken: body.cardToken
        },
        customerCode: body.customerCode || undefined
      })
    });

    const data = await response.json();

    if (!response.ok || (data.status && data.status !== 'APPROVED')) {
      console.error('Balance charge failed:', data);
      return {
        statusCode: 200, // still 200 so Apps Script can read the error body cleanly
        body: JSON.stringify({
          success: false,
          error: data.responseMessage || data.error || 'Charge declined or failed.',
          raw: data
        })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        transactionId: data.transactionId || '',
        status: data.status || ''
      })
    };

  } catch (err) {
    console.error('helcim-charge-balance function error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: 'Something went wrong contacting Helcim.' })
    };
  }
};
