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
 * SEP 26 REVISION — IMPORTANT:
 * This function used to also send the registrant's email inside
 * customerRequest.billingAddress, to get an email attached to the Helcim
 * customer record. That broke every payment, because Helcim requires
 * street1 and postalCode whenever billingAddress is present at all, and
 * our registration form never collects a street address or ZIP.
 *
 * The fix: don't send billingAddress here at all. Helcim's own card entry
 * modal already collects a billing address from the cardholder for AVS
 * purposes, on every payment, regardless of what we send, so nothing is
 * lost by leaving it out here. The email now gets attached AFTER a
 * successful payment instead, by helcim-validate.js, using the address
 * Helcim already collected during card entry rather than asking the
 * registrant to type it a second time.
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
 *       (email is accepted but no longer used here — see above)
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

  // Name is required for every payment, so Helcim's customer record has a
  // real name attached (this also prepopulates the Cardholder name field
  // in the payment modal). Email is intentionally NOT required or used
  // here anymore, see the note at the top of this file.
  const fullName = (body.fullName || '').trim();

  if (!fullName) {
    console.error('Missing fullName.');
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Please go back and enter your full name before paying.' })
    };
  }

  const requestBody = {
    paymentType: 'purchase',
    amount: amount,
    currency: 'USD',
    paymentMethod: 'cc-ach',
    allowExit: true,
    confirmationScreen: true,
    // Deliberately NOT including billingAddress here. See the note at the
    // top of this file for why.
    customerRequest: {
      contactName: fullName
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
