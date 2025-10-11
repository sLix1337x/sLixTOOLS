import React, { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Type, Copy, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import ToolPageLayout from '@/components/ToolPageLayout';

const ConvertCaseTool: React.FC = () => {
  const [inputText, setInputText] = useState<string>('');

  const convertToLowerCase = useCallback(() => {
    const converted = inputText.toLowerCase();
    setInputText(converted);
    toast.success('Text converted to lowercase!');
  }, [inputText]);

  const convertToUpperCase = useCallback(() => {
    const converted = inputText.toUpperCase();
    setInputText(converted);
    toast.success('Text converted to UPPERCASE!');
  }, [inputText]);

  const convertToCapitalizedCase = useCallback(() => {
    const converted = inputText.replace(/\b\w/g, (char) => char.toUpperCase());
    setInputText(converted);
    toast.success('Text converted to Capitalized Case!');
  }, [inputText]);

  const convertToSentenceCase = useCallback(() => {
    const converted = inputText.toLowerCase().replace(/(^|[.!?]\s*)([a-z])/g, (_, p1, p2) => p1 + p2.toUpperCase());
    setInputText(converted);
    toast.success('Text converted to Sentence case!');
  }, [inputText]);

  const convertToAlternatingCase = useCallback(() => {
    const converted = inputText
      .split('')
      .map((char, index) => {
        if (char.match(/[a-zA-Z]/)) {
          return index % 2 === 0 ? char.toLowerCase() : char.toUpperCase();
        }
        return char;
      })
      .join('');
    setInputText(converted);
    toast.success('Text converted to aLtErNaTiNg cAsE!');
  }, [inputText]);

  const clearText = useCallback(() => {
    setInputText('');
    toast.success('Text cleared!');
  }, []);

  const copyToClipboard = useCallback(async () => {
    if (!inputText) {
      toast.error('No text to copy!');
      return;
    }
    
    try {
      await navigator.clipboard.writeText(inputText);
      toast.success('Text copied to clipboard!');
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_error) {
      // Clipboard API not supported or permission denied
      // Fallback to manual copy instruction
      toast.error('Unable to copy automatically. Please copy manually.');
    }
  }, [inputText]);

  return (
    <ToolPageLayout
      title="Convert Case Tool"
      description="Convert text between different letter cases instantly."
      keywords="text case converter, uppercase, lowercase, capitalize, sentence case, alternating case"
      canonicalUrl="/tools/convert-case"
      pageTitle="Convert Case Tool - sLixTOOLS"
      pageDescription="Convert text between different cases: lowercase, UPPERCASE, Capitalized Case, Sentence case, and aLtErNaTiNg cAsE."
    >
      <div className="max-w-4xl mx-auto">
        <div className="space-y-4">
          <div>
            <Label htmlFor="input-text" className="text-white mb-2 block text-lg font-semibold flex items-center">
              <Type className="h-5 w-5 mr-2" />
              Enter your text:
            </Label>
            <Textarea
               id="input-text"
               placeholder="Type or paste your text here..."
               value={inputText}
               onChange={(e) => setInputText(e.target.value)}
               className="min-h-[150px] border border-white/20 text-white placeholder-gray-400 resize-none text-base"
               style={{ backgroundColor: '#171714' }}
             />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                 <Button
                   onClick={convertToLowerCase}
                   disabled={!inputText.trim()}
                   className="bg-green-600 hover:bg-green-700 text-white border-0 outline-none focus:outline-none focus:ring-0 h-9"
                 >
                   lowercase
                 </Button>
                 
                 <Button
                   onClick={convertToUpperCase}
                   disabled={!inputText.trim()}
                   className="bg-green-600 hover:bg-green-700 text-white border-0 outline-none focus:outline-none focus:ring-0 h-9"
                 >
                   UPPERCASE
                 </Button>
                 
                 <Button
                   onClick={convertToCapitalizedCase}
                   disabled={!inputText.trim()}
                   className="bg-green-600 hover:bg-green-700 text-white border-0 outline-none focus:outline-none focus:ring-0 h-9"
                 >
                   Capitalized Case
                 </Button>
                 
                 <Button
                   onClick={convertToSentenceCase}
                   disabled={!inputText.trim()}
                   className="bg-green-600 hover:bg-green-700 text-white border-0 outline-none focus:outline-none focus:ring-0 h-9"
                 >
                   Sentence case
                 </Button>
                 
                 <Button
                   onClick={convertToAlternatingCase}
                   disabled={!inputText.trim()}
                   className="bg-green-600 hover:bg-green-700 text-white border-0 outline-none focus:outline-none focus:ring-0 h-9"
                 >
                   aLtErNaTiNg cAsE
                 </Button>
                 
                 <Button
                   onClick={clearText}
                   className="bg-green-600 hover:bg-green-700 text-white border-0 outline-none focus:outline-none focus:ring-0 h-9"
                 >
                   <Trash2 className="h-4 w-4 mr-2" />
                   Clear
                 </Button>
               </div>

              {inputText && (
                 <div className="flex justify-center">
                   <Button
                     onClick={copyToClipboard}
                     className="bg-green-600 hover:bg-green-700 text-white border-0 outline-none focus:outline-none focus:ring-0 h-9"
                   >
                     <Copy className="h-4 w-4 mr-2" />
                     Copy Text
                   </Button>
                 </div>
               )}
            </div>
         </div>
         
         {/* SEO Content Section */}
         <div className="max-w-4xl mx-auto mt-12 px-4">
           <div className="text-center space-y-6">
             <h2 className="text-2xl font-bold text-white mb-4">Free Online Text Case Converter Tool</h2>
             <div className="grid md:grid-cols-2 gap-6 text-left">
               <div className="space-y-3">
                 <h3 className="text-lg font-semibold text-blue-400">Transform Text Cases Instantly</h3>
                 <p className="text-gray-300 text-sm leading-relaxed">
                   Convert your text between different letter cases with our free online tool. Perfect for formatting content, 
                   coding, writing, and document preparation. No downloads required - works directly in your browser.
                 </p>
               </div>
               <div className="space-y-3">
                 <h3 className="text-lg font-semibold text-blue-400">Supported Case Types</h3>
                 <ul className="text-gray-300 text-sm space-y-1">
                   <li>• <strong>lowercase:</strong> convert all text to small letters</li>
                   <li>• <strong>UPPERCASE:</strong> convert all text to capital letters</li>
                   <li>• <strong>Capitalized Case:</strong> first letter of each word capitalized</li>
                   <li>• <strong>Sentence case:</strong> first letter of each sentence capitalized</li>
                   <li>• <strong>aLtErNaTiNg cAsE:</strong> alternating between upper and lower case</li>
                 </ul>
               </div>
             </div>
             <div className="mt-8 p-4 bg-white/5 rounded-lg">
               <h3 className="text-lg font-semibold text-blue-400 mb-2">Why Use Our Case Converter?</h3>
               <div className="grid md:grid-cols-3 gap-4 text-sm text-gray-300">
                 <div>✓ Fast and reliable text processing</div>
                 <div>✓ No file uploads or registration needed</div>
                 <div>✓ Works with any amount of text</div>
                 <div>✓ Copy results with one click</div>
                 <div>✓ Mobile and desktop friendly</div>
                 <div>✓ Completely free to use</div>
               </div>
             </div>
           </div>
         </div>
    </ToolPageLayout>
   );
 };

export default ConvertCaseTool;