import React from 'react';
import { Zap, Lock } from 'lucide-react';

const SocialProof: React.FC = () => {
    return (
        <div className="social-proof flex flex-col sm:flex-row items-center justify-center lg:justify-start">
            <div className="flex items-center gap-2 text-green-400 font-semibold">
                <Zap className="h-5 w-5" />
                <span>150+ BPM</span>
            </div>
            <div className="hidden sm:block w-px h-4 bg-gray-600 mx-4"></div>
            <div className="flex items-center gap-2 text-blue-400 font-semibold">
                <Lock className="h-5 w-5" />
                <span>100% Private Processing</span>
            </div>
        </div>
    );
};

export default SocialProof;
