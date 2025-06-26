import React from 'react';

const Impressum = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white">
      <div className="container mx-auto py-10 px-4">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold mb-8 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-violet-400">Impressum</h1>
          
          <div className="prose prose-invert max-w-none">
            <p className="text-gray-300">
              Gemäß § 5 TMG
            </p>
            
            <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-100">Angaben zum Betreiber</h2>
            <p className="text-gray-300">
              [Vorname Nachname]<br />
              [Straße, Hausnummer]<br />
              [Postleitzahl] [Stadt]<br />
              Deutschland
            </p>
            
            <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-100">Kontakt</h2>
            <p className="text-gray-300">
              Telefon: [Ihre Telefonnummer]<br />
              E-Mail: [Ihre E-Mail-Adresse]
            </p>
            
            {/* Include the following sections if applicable */}
            <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-100">Umsatzsteuer-ID</h2>
            <p className="text-gray-300">
              Umsatzsteuer-Identifikationsnummer gemäß § 27 a Umsatzsteuergesetz:<br />
              [Ihre USt-IdNr.]
            </p>
            
            <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-100">Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV</h2>
            <p className="text-gray-300">
              [Vorname Nachname]<br />
              [Straße, Hausnummer]<br />
              [Postleitzahl] [Stadt]<br />
              Deutschland
            </p>
            
            <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-100">EU-Streitschlichtung</h2>
            <p className="text-gray-300">
              Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit: 
              <a href="https://ec.europa.eu/consumers/odr/" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 ml-1">
                https://ec.europa.eu/consumers/odr/
              </a>.<br />
              Unsere E-Mail-Adresse finden Sie oben im Impressum.
            </p>
            
            <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-100">Verbraucherstreitbeilegung/Universalschlichtungsstelle</h2>
            <p className="text-gray-300">
              Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.
            </p>
            
            <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-100">Haftung für Inhalte</h2>
            <p className="text-gray-300">
              Als Diensteanbieter sind wir gemäß § 7 Abs.1 TMG für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. 
              Nach §§ 8 bis 10 TMG sind wir als Diensteanbieter jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde Informationen zu 
              überwachen oder nach Umständen zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen.
            </p>
            <p className="text-gray-300 mt-2">
              Verpflichtungen zur Entfernung oder Sperrung der Nutzung von Informationen nach den allgemeinen Gesetzen bleiben hiervon unberührt. 
              Eine diesbezügliche Haftung ist jedoch erst ab dem Zeitpunkt der Kenntnis einer konkreten Rechtsverletzung möglich. 
              Bei Bekanntwerden von entsprechenden Rechtsverletzungen werden wir diese Inhalte umgehend entfernen.
            </p>
            
            <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-100">Haftung für Links</h2>
            <p className="text-gray-300">
              Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir keinen Einfluss haben. 
              Deshalb können wir für diese fremden Inhalte auch keine Gewähr übernehmen. Für die Inhalte der verlinkten Seiten 
              ist stets der jeweilige Anbieter oder Betreiber der Seiten verantwortlich. Die verlinkten Seiten wurden zum 
              Zeitpunkt der Verlinkung auf mögliche Rechtsverstöße überprüft. Rechtswidrige Inhalte waren zum Zeitpunkt der Verlinkung nicht erkennbar.
            </p>
            <p className="text-gray-300 mt-2">
              Eine permanente inhaltliche Kontrolle der verlinkten Seiten ist jedoch ohne konkrete Anhaltspunkte einer Rechtsverletzung nicht zumutbar. 
              Bei Bekanntwerden von Rechtsverletzungen werden wir derartige Links umgehend entfernen.
            </p>
            
            <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-100">Urheberrecht</h2>
            <p className="text-gray-300">
              Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen dem deutschen Urheberrecht. 
              Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb der Grenzen des Urheberrechtes bedürfen 
              der schriftlichen Zustimmung des jeweiligen Autors bzw. Erstellers. Downloads und Kopien dieser Seite sind nur für den privaten, 
              nicht kommerziellen Gebrauch gestattet.
            </p>
            <p className="text-gray-300 mt-2">
              Soweit die Inhalte auf dieser Seite nicht vom Betreiber erstellt wurden, werden die Urheberrechte Dritter beachtet. 
              Insbesondere werden Inhalte Dritter als solche gekennzeichnet. Sollten Sie trotzdem auf eine Urheberrechtsverletzung aufmerksam werden, 
              bitten wir um einen entsprechenden Hinweis. Bei Bekanntwerden von Rechtsverletzungen werden wir derartige Inhalte umgehend entfernen.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Impressum;
