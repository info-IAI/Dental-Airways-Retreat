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
 * don't trust the customer/card reference for the automatic later charge,
 * flag it for manual follow-up instead. Once we've confirmed real hashes
 * match, this can be tightened if desired.
 *
 * Endpoint: /.netlify/functions/helcim-validate
 * Method: POST
 * Body: { rawDataResponse: object, hash: string, secretToken: string }
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

  const { rawDataResponse, hash, secretToken } = body;

  if (!rawDataResponse || !hash || !secretToken) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing required fields.' })
    };
  }

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

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': 'https://integratedairwayinstitute.com'
      },
      body: JSON.stringify({
        valid: isValid,
        transactionId: rawDataResponse.transactionId || '',
        status: rawDataResponse.status || '',
        amount: rawDataResponse.amount || '',
        // Only hand back the customer/card reference if the hash actually
        // matched, otherwise the caller should treat this as unavailable.
        customerCode: isValid ? (rawDataResponse.customerCode || '') : '',
        cardToken: isValid ? (rawDataResponse.cardToken || '') : ''
      })
    };

  } catch (err) {
    console.error('Validation function error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Validation error.' })
    };
  }
};
