
import React from 'react';

const TermsOfService = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white">
      <div className="container mx-auto py-10 px-4">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold mb-8 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-violet-400">Terms of Service</h1>
          
          <div className="prose prose-invert max-w-none">
            <p className="text-gray-300">
              Last updated: May 10, 2025
            </p>
            
            <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-100">Introduction</h2>
            <p className="text-gray-300">
              Welcome to GIFConvert. These Terms of Service govern your use of our website and MP4 to GIF conversion service. By accessing or using our service, you agree to be bound by these Terms.
            </p>
            
            <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-100">Use of Service</h2>
            <p className="text-gray-300">
              GIFConvert provides a free online tool for converting video files to GIF format. You may use our service for personal and commercial purposes in accordance with these Terms.
            </p>
            
            <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-100">User Responsibilities</h2>
            <p className="text-gray-300">
              When using our service, you agree:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-300">
              <li>Not to use the service for any illegal purposes</li>
              <li>Not to upload content that infringes on intellectual property rights</li>
              <li>Not to attempt to disrupt or compromise the security of the service</li>
              <li>Not to distribute malware or other harmful content</li>
              <li>To comply with all applicable laws and regulations</li>
            </ul>
            
            <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-100">Intellectual Property</h2>
            <p className="text-gray-300">
              The service, including its design, logos, and content (excluding user-uploaded content), is owned by GIFConvert and protected by copyright and other intellectual property laws.
            </p>
            <p className="text-gray-300 mt-2">
              You retain all rights to your content. By using our service, you grant us a limited license to process your content solely for the purpose of providing the conversion service to you.
            </p>
            
            <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-100">Disclaimer of Warranties</h2>
            <p className="text-gray-300">
              The service is provided "as is" without warranties of any kind, either express or implied. We do not guarantee that the service will be error-free, secure, or continuously available.
            </p>
            
            <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-100">Limitation of Liability</h2>
            <p className="text-gray-300">
              GIFConvert shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of or inability to use the service.
            </p>
            
            <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-100">Changes to Terms</h2>
            <p className="text-gray-300">
              We reserve the right to modify these Terms at any time. Changes will be effective immediately upon posting on the website. Your continued use of the service after any changes constitutes acceptance of the modified Terms.
            </p>
            
            <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-100">Governing Law</h2>
            <p className="text-gray-300">
              These Terms shall be governed by and construed in accordance with the laws of the United States, without regard to its conflict of law provisions.
            </p>
            
            <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-100">Contact</h2>
            <p className="text-gray-300">
              If you have any questions about these Terms, please contact us at terms@gifconvert.example.com.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;
