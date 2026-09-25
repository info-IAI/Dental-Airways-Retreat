/**
 * Netlify Function: helcim-init
 * -----------------------------
 * Initializes a HelcimPay.js checkout session server-side.
 * Called from the registration form on the landing page.
 *
 * Accepts a planType ('full' or 'deposit') instead of an amount. The dollar
 * amount is decided HERE, server-side, from a fixed lookup table, never
 * trusted from the client, so nobody can tamper with the browser request
 * to pay $1 for a $6,100 retreat.
 *
 * For EVERY payment (full or deposit), the registrant's name and email are
 * sent to Helcim as a customerRequest, so the Helcim customer record has an
 * email address and Helcim can send the customer their receipt.
 * (Before Sep 24, 2026 this was only done for deposits, which is why the
 * first full payment came through with no email on file.)
 *
 * For the 'deposit' plan only, the card/bank is also saved as the
 * customer's default payment method, so the remaining balance can be
 * charged later without the registrant needing to be present.
 *
 * Your Helcim API token is stored as a Netlify environment variable
 * (HELCIM_API_TOKEN) and never exposed in front-end code.
 *
 * Endpoint: /.netlify/functions/helcim-init
 * Method: POST
 * Body: { planType: 'full' | 'deposit', fullName: string, email: string }
 * Returns: { checkoutToken, secretToken } on success
 */

// Fixed, server-side amounts. The client can only choose WHICH of these
// to use (via planType), never supply its own amount.
const PLAN_AMOUNTS = {
  full: 6100.00,
  deposit: 3050.00
};

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

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (e) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid request.' })
    };
  }

  const planType = body.planType;
  const amount = Object.prototype.hasOwnProperty.call(PLAN_AMOUNTS, planType)
    ? PLAN_AMOUNTS[planType]
    : null;

  if (!amount) {
    console.error('Invalid or missing planType:', planType);
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid payment plan selected. Please refresh and try again.' })
    };
  }

  // Name and email are required for every payment, so every Helcim
  // customer record has an email address for receipts.
  const fullName = (body.fullName || '').trim();
  const email = (body.email || '').trim();

  if (!fullName || !email) {
    console.error('Missing fullName or email. fullName:', fullName, 'email:', email);
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Please go back and enter your full name and email address before paying.' })
    };
  }

  const requestBody = {
    paymentType: 'purchase',
    amount: amount,
    currency: 'USD',
    paymentMethod: 'cc-ach',
    allowExit: true,
    confirmationScreen: true,
    // Creates the Helcim customer with name and email. Per Helcim's docs,
    // a customer's email is stored inside billingAddress, not at the top level.
    customerRequest: {
      contactName: fullName,
      billingAddress: {
        name: fullName,
        email: email
      }
    }
  };

  // Only the deposit plan needs the card/bank saved for a later automatic
  // charge. A full payment has nothing left to charge later.
  if (planType === 'deposit') {
    requestBody.setAsDefaultPaymentMethod = 1;
  }

  try {
    const response = await fetch('https://api.helcim.com/v2/helcim-pay/initialize', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-token': apiToken,
        'content-type': 'application/json'
      },
      body: JSON.stringify(requestBody)
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
