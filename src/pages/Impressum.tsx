import React from 'react';

const Impressum = () => {
  return (
    <div className="min-h-screen text-white">
      <div className="container mx-auto py-10 px-4">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold mb-8 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-violet-400">Impressum</h1>
          
          <div className="prose prose-invert max-w-none">
            <p className="text-gray-300">
              According to § 5 TMG (German Telemedia Act)
            </p>
            
            <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-100">Site Owner Information</h2>
            <p className="text-gray-300">
              [First Name Last Name]<br />
              [Street Address, House Number]<br />
              [Postal Code] [City]<br />
              Germany
            </p>
            
            <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-100">Contact</h2>
            <p className="text-gray-300">
              Phone: [Your Phone Number]<br />
              Email: [Your Email Address]
            </p>
            
            {/* Include the following sections if applicable */}
            <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-100">VAT Registration Number</h2>
            <p className="text-gray-300">
              VAT identification number according to § 27a of the German VAT Act:<br />
              [Your VAT Number]
            </p>
            
            <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-100">Responsible for Content According to § 55(2) RStV</h2>
            <p className="text-gray-300">
              [First Name Last Name]<br />
              [Street Address, House Number]<br />
              [Postal Code] [City]<br />
              Germany
            </p>
            
            <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-100">EU Dispute Resolution</h2>
            <p className="text-gray-300">
              The European Commission provides a platform for online dispute resolution (OS): 
              <a href="https://ec.europa.eu/consumers/odr/" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 ml-1">
                https://ec.europa.eu/consumers/odr/
              </a>.<br />
              Our email address can be found above in the site owner information.
            </p>
            
            <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-100">Dispute Resolution</h2>
            <p className="text-gray-300">
              We are neither willing nor obligated to participate in dispute resolution proceedings before a consumer arbitration board.
            </p>
            
            <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-100">Liability for Content</h2>
            <p className="text-gray-300">
              As a service provider, we are responsible for our own content on these pages in accordance with § 7(1) TMG (German Telemedia Act). 
              According to §§ 8 to 10 TMG, however, we as service providers are not obligated to monitor transmitted or stored third-party information 
              or to investigate circumstances that indicate illegal activity.
            </p>
            <p className="text-gray-300 mt-2">
              Obligations to remove or block the use of information under general law remain unaffected. 
              However, liability in this regard is only possible from the point in time at which a concrete infringement of the law becomes known. 
              If we become aware of any such infringements, we will remove this content immediately.
            </p>
            
            <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-100">Liability for Links</h2>
            <p className="text-gray-300">
              Our offer contains links to external websites of third parties, on whose contents we have no influence. 
              Therefore, we cannot assume any liability for these external contents. The respective provider or operator of the pages is 
              always responsible for the contents of the linked pages. The linked pages were checked for possible legal violations at the time of linking. 
              Illegal content was not recognizable at the time of linking.
            </p>
            <p className="text-gray-300 mt-2">
              However, a permanent control of the content of the linked pages is not reasonable without concrete evidence of a violation of law. 
              If we become aware of any infringements, we will remove such links immediately.
            </p>
            
            <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-100">Copyright</h2>
            <p className="text-gray-300">
              The content and works created by the site operators on these pages are subject to German copyright law. 
              The duplication, processing, distribution, and any kind of exploitation outside the limits of copyright law require 
              the written consent of the respective author or creator. Downloads and copies of this site are only permitted for private, 
              non-commercial use.
            </p>
            <p className="text-gray-300 mt-2">
              Insofar as the content on this site was not created by the operator, the copyrights of third parties are respected. 
              In particular, third-party content is identified as such. Should you nevertheless become aware of a copyright infringement, 
              please inform us accordingly. If we become aware of any infringements, we will remove such content immediately.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Impressum;
