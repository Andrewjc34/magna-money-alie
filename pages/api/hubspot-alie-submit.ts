import type { NextApiRequest, NextApiResponse } from 'next';

const HUBSPOT_PORTAL_ID = '8402236';
const HUBSPOT_FORM_ID = 'MY_HUBSPOT_FORM_ID'; // Replace with actual form GUID later
const HUBSPOT_PRIVATE_APP_TOKEN = process.env.HUBSPOT_PRIVATE_APP_TOKEN;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return res.status(405).json({ message: 'Method Not Allowed' });
    }

    if (!HUBSPOT_PRIVATE_APP_TOKEN) {
      return res.status(500).json({ message: 'HubSpot private app token is not configured' });
    }

    const body = req.body;

    // Basic email check
    if (!body.email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const fields: { name: string; value: any }[] = [];

    // Email
    if (body.email) {
      fields.push({ name: 'email', value: body.email });
    }

    // Business Name
    if (body['Business Name']) {
      fields.push({ name: 'business_name', value: body['Business Name'] });
    }

    // Name(s)
    if (body['Name(s)']) {
      fields.push({ name: 'firstname', value: body['Name(s)'] });
    }

    // ALIE fields (hidden totals from the HTML form)
    const alieFields = [
      'alie_total_monthly_income',
      'alie_total_monthly_expenditure',
      'alie_monthly_surplus_deficit',
      'alie_total_assets',
      'alie_total_liabilities',
      'alie_net_worth',
    ];

    for (const key of alieFields) {
      if (body[key]) {
        fields.push({ name: key, value: body[key] });
      }
    }

    const hutk = req.cookies?.hubspotutk || '';
    const pageUri = req.headers.referer || '';
    const pageName = 'Magna Money ALIE Form';

    const payload = {
      fields,
      context: {
        hutk,
        pageUri,
        pageName,
      },
    };

    const url = `https://api.hsforms.com/submissions/v3/integration/submit/${HUBSPOT_PORTAL_ID}/${HUBSPOT_FORM_ID}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${HUBSPOT_PRIVATE_APP_TOKEN}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('HubSpot error:', text);
      return res.status(500).json({ message: 'Failed to submit to HubSpot', detail: text });
    }

    // Redirect to thank you page
    res.writeHead(302, {
      Location: 'https://magna-money-alie.vercel.app/thank-you-ALIE.html',
    });
    res.end();
  } catch (err: any) {
    console.error('Server error:', err);
    return res
      .status(500)
      .json({ message: 'Server error', error: err?.message || 'Unknown error' });
  }
}