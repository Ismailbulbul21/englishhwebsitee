import React from 'react';

const PrivacyPolicy = () => {
  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg my-8">
      <h1 className="text-4xl font-bold mb-8 text-gray-800 text-center">Privacy Policy</h1>
      
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
        <p className="text-blue-800">
          <strong>Last updated:</strong> {new Date().toLocaleDateString()}
        </p>
      </div>
      
      <div className="space-y-8 text-gray-700 leading-relaxed">
        
        <section>
          <h2 className="text-2xl font-semibold text-gray-800 mb-4 border-b border-gray-200 pb-2">
            1. Information We Collect
          </h2>
          <div className="space-y-3">
            <p>
              We collect information you provide directly to us when you:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Create an account or register for our services</li>
              <li>Subscribe to our newsletter or educational content</li>
              <li>Contact us through our contact forms</li>
              <li>Participate in our English learning exercises</li>
              <li>Use our voice recording features</li>
            </ul>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-gray-800 mb-4 border-b border-gray-200 pb-2">
            2. Google AdSense and Advertising
          </h2>
          <div className="space-y-3">
            <p>
              This website uses Google AdSense to display advertisements. Google AdSense may use cookies to serve ads based on your visits to this site and other sites on the Internet.
            </p>
            <p>
              You may opt out of personalized advertising by visiting <a href="https://www.google.com/settings/ads" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">Google's Ads Settings</a>.
            </p>
            <p>
              Third-party vendors, including Google, use cookies to serve ads based on a user's prior visits to your website or other websites.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-gray-800 mb-4 border-b border-gray-200 pb-2">
            3. Cookies and Tracking Technologies
          </h2>
          <div className="space-y-3">
            <p>
              We use cookies and similar tracking technologies to track activity on our service and hold certain information. These technologies include:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><strong>Cookies:</strong> Small data files placed on your device</li>
              <li><strong>Local Storage:</strong> To save your learning progress</li>
              <li><strong>Analytics:</strong> To understand how you use our service</li>
            </ul>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-gray-800 mb-4 border-b border-gray-200 pb-2">
            4. How We Use Your Information
          </h2>
          <div className="space-y-3">
            <p>We use the information we collect to:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Provide, maintain, and improve our English learning services</li>
              <li>Personalize your learning experience</li>
              <li>Send you educational content and updates</li>
              <li>Respond to your comments and questions</li>
              <li>Analyze usage patterns to improve our platform</li>
            </ul>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-gray-800 mb-4 border-b border-gray-200 pb-2">
            5. Data Security
          </h2>
          <p>
            We implement appropriate security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the Internet or electronic storage is 100% secure.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-gray-800 mb-4 border-b border-gray-200 pb-2">
            6. Children's Privacy
          </h2>
          <p>
            Our service is designed for users of all ages. If you are under 13, please have your parent or guardian review this privacy policy with you before using our service.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-gray-800 mb-4 border-b border-gray-200 pb-2">
            7. International Data Transfers
          </h2>
          <p>
            Your information may be transferred to and processed in countries other than your own. We ensure appropriate safeguards are in place to protect your data in accordance with applicable data protection laws.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-gray-800 mb-4 border-b border-gray-200 pb-2">
            8. Your Rights
          </h2>
          <div className="space-y-3">
            <p>You have the right to:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Access and update your personal information</li>
              <li>Request deletion of your personal data</li>
              <li>Opt out of marketing communications</li>
              <li>Object to processing of your personal data</li>
            </ul>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-gray-800 mb-4 border-b border-gray-200 pb-2">
            9. Changes to This Privacy Policy
          </h2>
          <p>
            We may update this privacy policy from time to time. We will notify you of any changes by posting the new privacy policy on this page and updating the "Last updated" date.
          </p>
        </section>

        <section className="bg-gray-50 p-6 rounded-lg">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">
            10. Contact Us
          </h2>
          <p className="mb-4">
            If you have any questions about this Privacy Policy, please contact us:
          </p>
          <div className="space-y-2">
            <p><strong>Email:</strong> privacy@tiktokenglish.com</p>
            <p><strong>Website:</strong> Contact form available on our Contact page</p>
            <p><strong>Response Time:</strong> We typically respond within 24-48 hours</p>
          </div>
        </section>

      </div>
    </div>
  );
};

export default PrivacyPolicy;




