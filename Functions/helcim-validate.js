/**
 * Netlify Function: helcim-validate
 * ----------------------------------
 * Validates a completed HelcimPay.js transaction server-side, per Helcim's
 * documented validation pattern (https://devdocs.helcim.com/docs/helcimpayjs-validation).
 *
 * WHY THIS EXISTS: the browser receives the transaction result (including
 * cardToken and customerCode) via a postMessage event from Helcim's iframe.
 * That data is convenient but not something to trust blindly, someone
 * could tamper with it in their browser before it reaches our code. This
 * function recomputes Helcim's hash server-side (using the secretToken,
 * which never leaves the server) and only trusts the customer/card
 * reference if the hash actually matches.
 *
 * IMPORTANT — NEEDS A REAL TEST BEFORE FULLY TRUSTING:
 * The hash algorithm here follows Helcim's documented examples exactly,
 * but we have not yet confirmed it against a real transaction. Because of
 * that, this function does NOT block the registration if the hash fails
 * to match, the payment has already succeeded through Helcim directly by
 * this point regardless of what we do here. A hash mismatch only means:
 * don't trust the customer/card reference for the automatic later charge
 * or the email-attach step below, flag it for manual follow-up instead.
 *
 * SEP 26 ADDITION — attaching the registrant's email:
 * helcim-init.js no longer sends an email to Helcim at checkout time
 * (see that file's comments for why: billingAddress requires a street
 * address and ZIP, which our registration form doesn't collect, and we
 * didn't want to ask registrants to type an address twice). Instead,
 * once a payment succeeds, this function:
 *   1. Looks up the customer Helcim automatically created, using the
 *      customerCode from the transaction. That customer record already
 *      has a billing address, Helcim's own card modal collects one from
 *      the cardholder for AVS purposes on every payment, regardless of
 *      what we send at initialize time.
 *   2. Sends that SAME address back in an Update customer call, adding
 *      only the email field. Nothing the registrant typed changes,
 *      we're not fabricating an address, just attaching their email to
 *      the address Helcim already has on file.
 * This step is best-effort: if it fails for any reason, we log the error
 * and move on rather than failing the whole validation, the payment
 * already succeeded regardless of whether this extra step works.
 *
 * NEEDS A REAL TEST: the exact shape of Helcim's "Get customers" search
 * response (whether it's a bare array or a wrapped { data: [...] } object)
 * is inferred from documentation examples, not yet confirmed against a
 * live response. The code below handles both shapes defensively, but
 * should be watched on the first real test transaction.
 *
 * Endpoint: /.netlify/functions/helcim-validate
 * Method: POST
 * Body: { rawDataResponse: object, hash: string, secretToken: string,
 *         email: string, fullName: string }
 * Returns: { valid: boolean, customerCode, cardToken, transactionId, amount, status }
 */

const crypto = require('crypto');

exports.handler = async function (event) {

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
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

  // TEMPORARY DIAGNOSTIC LOGGING — moved above the missing-fields check,
  // since the last test returned in ~4ms with nothing logged, meaning it
  // was very likely exiting AT that check, before reaching any logging.
  // This placement guarantees we see the raw request no matter what.
  console.log('helcim-validate raw body received:', JSON.stringify(body));

  const { rawDataResponse, hash, secretToken, email } = body;

  console.log('Parsed: rawDataResponse present=' + !!rawDataResponse + ' hash present=' + !!hash + ' secretToken present=' + !!secretToken + ' email present=' + !!email);

  if (!rawDataResponse || !hash || !secretToken) {
    console.log('EXITING EARLY: missing required fields, see above for what was actually received.');
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing required fields.' })
    };
  }

  // TEMPORARY DIAGNOSTIC LOGGING — added Sep 26 to find out what Helcim's
  // SUCCESS payload actually contains, since customerCode/cardToken were
  // assumed field names, never confirmed against a live response. Remove
  // once confirmed working.
  console.log('rawDataResponse keys received:', Object.keys(rawDataResponse));
  console.log('rawDataResponse full content:', JSON.stringify(rawDataResponse));
  console.log('email present in request body:', !!email);

  let result;

  try {
    // Recompute the hash the same way Helcim does: JSON-encode the
    // transaction data, append the secretToken, sha256 the result.
    const normalized = JSON.stringify(rawDataResponse);
    const computedHash = crypto
      .createHash('sha256')
      .update(normalized + secretToken)
      .digest('hex');

    const isValid = computedHash === hash;

    if (!isValid) {
      // Log loudly so this is visible in Netlify's function logs, this
      // should not happen in normal operation once confirmed working.
      console.error('HASH MISMATCH on transaction validation.', {
        transactionId: rawDataResponse.transactionId,
        computedHash,
        receivedHash: hash
      });
    }

    result = {
      valid: isValid,
      transactionId: rawDataResponse.transactionId || '',
      status: rawDataResponse.status || '',
      amount: rawDataResponse.amount || '',
      // Only hand back the customer/card reference if the hash actually
      // matched, otherwise the caller should treat this as unavailable.
      customerCode: isValid ? (rawDataResponse.customerCode || '') : '',
      cardToken: isValid ? (rawDataResponse.cardToken || '') : ''
    };

  } catch (err) {
    console.error('Validation function error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Validation error.' })
    };
  }

  // Best-effort: attach the registrant's email to the customer record
  // Helcim already created. Never lets a failure here affect the
  // response above, the payment already succeeded regardless.
  if (result.valid && result.customerCode && email) {
    try {
      await attachEmailToCustomer(result.customerCode, email);
      console.log('Email successfully attached to customer ' + result.customerCode);
    } catch (err) {
      console.error('Could not attach email to customer ' + result.customerCode + ':', err.message);
    }
  } else {
    // TEMPORARY DIAGNOSTIC LOGGING — see why this step was skipped.
    console.log('Email-attach step SKIPPED. valid=' + result.valid + ' customerCode="' + result.customerCode + '" email present=' + !!email);
  }

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': 'https://integratedairwayinstitute.com'
    },
    body: JSON.stringify(result)
  };
};

// ─────────────────────────────────────────────────────────────────────
// Looks up the customer Helcim auto-created (by customerCode), then
// updates that same customer with their existing billing address plus
// the registrant's email. Throws on any failure, caller logs and moves
// on rather than treating this as fatal.
// ─────────────────────────────────────────────────────────────────────
async function attachEmailToCustomer(customerCode, email) {
  const apiToken = process.env.HELCIM_API_TOKEN;
  if (!apiToken) {
    throw new Error('HELCIM_API_TOKEN is not set, cannot attach email.');
  }

  // Step 1: find the customer's numeric id and existing billing address
  // using their customerCode.
  const searchRes = await fetch(
    'https://api.helcim.com/v2/customers?customerCode=' + encodeURIComponent(customerCode),
    { headers: { accept: 'application/json', 'api-token': apiToken } }
  );

  if (!searchRes.ok) {
    throw new Error('Customer search failed with status ' + searchRes.status);
  }

  const searchData = await searchRes.json();
  // Defensive: Helcim's list endpoints have returned either a bare array
  // or a { data: [...] } wrapper in different examples, handle both.
  const customer = Array.isArray(searchData)
    ? searchData[0]
    : (searchData && Array.isArray(searchData.data) ? searchData.data[0] : null);

  if (!customer || !customer.id) {
    throw new Error('No customer found for customerCode ' + customerCode);
  }

  const existingAddress = customer.billingAddress || {};

  // Step 2: update that same customer, keeping their existing
  // AVS-collected address exactly as Helcim has it, only adding email.
  // Per Helcim's docs, billingAddress must include name + street1 +
  // postalCode whenever it's sent, so we send back what's already
  // there rather than asking the registrant to re-enter anything.
  const updateRes = await fetch('https://api.helcim.com/v2/customers/' + customer.id, {
    method: 'PUT',
    headers: {
      accept: 'application/json',
      'api-token': apiToken,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      billingAddress: Object.assign({}, existingAddress, { email: email })
    })
  });

  if (!updateRes.ok) {
    const errData = await updateRes.json().catch(function () { return {}; });
    throw new Error('Update customer failed: ' + JSON.stringify(errData));
  }
}
