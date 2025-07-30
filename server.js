require('dotenv').config();
const express = require('express');
const path = require('path');
const { Resend } = require('resend');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Resend for email sending
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// Parse JSON bodies
app.use(express.json({ limit: '1mb' }));

// Security middleware
app.use((req, res, next) => {
  // Security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Content-Security-Policy', "default-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; script-src 'self' 'unsafe-inline'; connect-src 'self' https://api.airtable.com;");
  
  // Remove server fingerprinting
  res.removeHeader('X-Powered-By');
  
  next();
});

// Email capture endpoint
app.post('/api/waitlist', async (req, res) => {
  try {
    const { email } = req.body;
    
    // Server-side email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }
    
    // Sanitize email
    const sanitizedEmail = email.trim().toLowerCase();
    
    // Send to Airtable
    const airtableResponse = await fetch(`https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${encodeURIComponent(process.env.AIRTABLE_TABLE_NAME)}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.AIRTABLE_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fields: {
          Email: sanitizedEmail,
          Timestamp: new Date().toISOString(),
          Source: 'Landing Page'
        }
      })
    });
    
    if (!airtableResponse.ok) {
      const errorData = await airtableResponse.text();
      console.error('Airtable error:', errorData);
      return res.status(500).json({ error: 'Failed to save email' });
    }
    
    // Send confirmation email
    if (resend && process.env.FROM_EMAIL) {
      try {
        await resend.emails.send({
          from: process.env.FROM_EMAIL,
          to: sanitizedEmail,
          subject: "Welcome to TimeBeacon Early Access! 🚀",
          html: `
            <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
              <div style="text-align: center; margin-bottom: 40px;">
                <div style="width: 64px; height: 64px; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; font-size: 28px; font-weight: 700; color: white; margin-bottom: 20px;">T</div>
                <h1 style="color: #000000; font-size: 24px; font-weight: 800; margin: 0;">TimeBeacon</h1>
              </div>
              
              <h2 style="color: #000000; font-size: 20px; font-weight: 700; margin-bottom: 16px;">You're in! Welcome to early access.</h2>
              
              <p style="color: #6b7280; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
                Thanks for joining the TimeBeacon early access waitlist! We're excited to help you and your team get back 2.5 hours every week.
              </p>
              
              <div style="background: #f9fafb; padding: 24px; border-radius: 12px; border-left: 4px solid #f093fb; margin-bottom: 24px;">
                <h3 style="color: #000000; font-size: 16px; font-weight: 600; margin: 0 0 8px 0;">What's Next?</h3>
                <p style="color: #6b7280; font-size: 14px; margin: 0;">We're launching with select Professional Services and Customer Success teams first. We'll reach out soon with next steps and early access details.</p>
              </div>
              
              <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin-bottom: 32px;">
                Questions? Just reply to this email - we'd love to hear from you.
              </p>
              
              <div style="text-align: center; padding-top: 32px; border-top: 1px solid #e5e7eb;">
                <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                  © 2024 TimeBeacon. Made with ❤️ for productive teams.
                </p>
              </div>
            </div>
          `
        });
        console.log('Confirmation email sent successfully');
      } catch (emailError) {
        console.error('Failed to send confirmation email:', emailError.message);
        // Don't fail the whole request if email fails
      }
    }
    
    console.log('Email successfully captured');
    res.status(200).json({ success: true, message: 'Email captured successfully' });
    
  } catch (error) {
    console.error('Waitlist error:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

// Serve static files from dist directory
app.use(express.static(path.join(__dirname, 'dist')));

// Serve the landing page for all routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Timebeacon Landing Page running on port ${PORT}`);
  console.log(`Visit: http://localhost:${PORT}`);
});