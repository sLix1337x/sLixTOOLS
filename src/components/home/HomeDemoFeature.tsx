import React from 'react';
import { FileVideo, Zap, Shield, FileImage, CircleDollarSign, Scissors, Sparkles } from 'lucide-react';
import AnimatedElement from '@/components/AnimatedElement';

interface HomeDemoFeatureProps {
    isVisible: boolean;
}

const HomeDemoFeature: React.FC<HomeDemoFeatureProps> = ({ isVisible }) => {
    return (
        <AnimatedElement type="scale" delay={0.3} isVisible={isVisible}>
            <div className="relative">
                {/* Main demo image/video placeholder */}
                <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-8 border border-green-400/20 shadow-2xl">
                    <div className="text-center">
                        <div className="mb-6">
                            <FileVideo className="h-16 w-16 mx-auto text-green-400 mb-4" />
                            <h3 className="text-xl font-bold text-white mb-2">Instant File Conversion</h3>
                            <p className="text-gray-300 text-sm">Drag, drop, convert. It's that simple.</p>
                        </div>

                        {/* Feature highlights */}
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="flex items-center gap-2 text-green-400">
                                <Zap className="h-4 w-4" />
                                <span>Lightning Fast</span>
                            </div>
                            <div className="flex items-center gap-2 text-blue-400">
                                <Shield className="h-4 w-4" />
                                <span>Secure</span>
                            </div>
                            <div className="flex items-center gap-2 text-purple-400">
                                <FileImage className="h-4 w-4" />
                                <span>Multiple Formats</span>
                            </div>
                            <div className="flex items-center gap-2 text-pink-400">
                                <CircleDollarSign className="h-4 w-4" />
                                <span>Always Free</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Floating elements for visual interest */}
                <div className="absolute -top-2 -right-2 bg-green-500 rounded-full p-3 shadow-lg floating">
                    <Scissors className="h-6 w-6 text-white" />
                </div>
                <div className="absolute -bottom-2 -left-2 bg-blue-500 rounded-full p-3 shadow-lg floating-delayed">
                    <Sparkles className="h-6 w-6 text-white" />
                </div>
            </div>
        </AnimatedElement>
    );
};

export default HomeDemoFeature;
