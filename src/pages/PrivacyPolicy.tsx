
import React from 'react';

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white">
      <div className="container mx-auto py-10 px-4">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold mb-8 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-violet-400">Privacy Policy</h1>
          
          <div className="prose prose-invert max-w-none">
            <p className="text-gray-300">
              Last updated: May 10, 2025
            </p>
            
            <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-100">Introduction</h2>
            <p className="text-gray-300">
              At GIFConvert, we take your privacy seriously. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website and use our Video to GIF conversion service.
            </p>
            
            <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-100">Information We Don't Collect</h2>
            <p className="text-gray-300">
              Our service is designed with privacy as a priority:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-300">
              <li>We do not store or upload your video or GIF files to any server.</li>
              <li>All processing happens locally in your browser.</li>
              <li>We do not track or analyze the content of your videos or GIFs.</li>
              <li>We do not require you to create an account or provide personal information to use our service.</li>
            </ul>
            
            <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-100">Information We May Collect</h2>
            <p className="text-gray-300">
              While using our service, we may collect:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-300">
              <li>Anonymous usage data (e.g., pages visited, time spent on site)</li>
              <li>Device information (e.g., browser type, operating system)</li>
              <li>IP address and general location (country level only)</li>
            </ul>
            
            <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-100">How We Use Information</h2>
            <p className="text-gray-300">
              Any information we collect is used for:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-300">
              <li>Improving our website and service</li>
              <li>Analyzing usage patterns</li>
              <li>Addressing technical issues</li>
              <li>Enhancing security</li>
            </ul>
            
            <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-100">Cookies</h2>
            <p className="text-gray-300">
              We use essential cookies to ensure the proper functioning of our website. These cookies do not collect personal information and are deleted when you close your browser.
            </p>
            
            <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-100">Third-Party Services</h2>
            <p className="text-gray-300">
              We may use third-party services such as analytics providers to help us understand how users interact with our website. These services may collect information about your use of our site.
            </p>
            
            <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-100">Changes to This Privacy Policy</h2>
            <p className="text-gray-300">
              We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date.
            </p>
            
            <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-100">Contact Us</h2>
            <p className="text-gray-300">
              If you have any questions about this Privacy Policy, please contact us at privacy@gifconvert.example.com.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
