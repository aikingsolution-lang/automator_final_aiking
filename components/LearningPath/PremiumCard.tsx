"use client";
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Crown, Zap, Target, TrendingUp, CheckCircle } from 'lucide-react';

const PremiumCard = () => {
  const handleBuyPremium = () => {
    // Navigate to pricing page or open payment modal
    window.location.href = '/pricing';
  };

  return (
    <div className="flex flex-col bg-[#11011E]">
      <Card className="bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)]">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg sm:text-xl ml-7 mt-7 font-raleway font-bold text-[#ECF1F0] flex items-center gap-2">
              <Crown className="h-5 w-5 text-[#0FAE96]" />
              Premium Analysis
            </CardTitle>
            <Badge className="border-[rgba(255,255,255,0.05)] mr-7 text-[#B6B6B6] font-inter text-xs bg-[rgba(15,174,150,0.1)] text-[#0FAE96]">
              UPGRADE
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-4">
            <p className="text-[#B6B6B6] font-inter text-sm">
              Get comprehensive insights into your career path with AI-powered analysis and personalized recommendations.
            </p>
            
            <div className="space-y-3">
              <div className="flex items-start">
                <div className="h-8 w-8 rounded-full bg-[rgba(15,174,150,0.1)] flex items-center justify-center mr-3 flex-shrink-0">
                  <CheckCircle className="h-4 w-4 text-[#0FAE96]" />
                </div>
                <div>
                  <h3 className="font-raleway font-semibold text-base text-[#ECF1F0] mb-1">
                    Detailed skill gap analysis
                  </h3>
                  <p className="text-[#B6B6B6] font-inter text-xs">
                    Priority levels and impact assessment
                  </p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="h-8 w-8 rounded-full bg-[rgba(15,174,150,0.1)] flex items-center justify-center mr-3 flex-shrink-0">
                  <Target className="h-4 w-4 text-[#0FAE96]" />
                </div>
                <div>
                  <h3 className="font-raleway font-semibold text-base text-[#ECF1F0] mb-1">
                    Personalized career roadmap
                  </h3>
                  <p className="text-[#B6B6B6] font-inter text-xs">
                    Timeline and milestone tracking
                  </p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="h-8 w-8 rounded-full bg-[rgba(15,174,150,0.1)] flex items-center justify-center mr-3 flex-shrink-0">
                  <TrendingUp className="h-4 w-4 text-[#0FAE96]" />
                </div>
                <div>
                  <h3 className="font-raleway font-semibold text-base text-[#ECF1F0] mb-1">
                    Industry-specific recommendations
                  </h3>
                  <p className="text-[#B6B6B6] font-inter text-xs">
                    Market trends and salary insights
                  </p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="h-8 w-8 rounded-full bg-[rgba(15,174,150,0.1)] flex items-center justify-center mr-3 flex-shrink-0">
                  <Zap className="h-4 w-4 text-[#0FAE96]" />
                </div>
                <div>
                  <h3 className="font-raleway font-semibold text-base text-[#ECF1F0] mb-1">
                    Advanced progress tracking
                  </h3>
                  <p className="text-[#B6B6B6] font-inter text-xs">
                    Analytics and performance metrics
                  </p>
                </div>
              </div>
            </div>
            
            <div className="pt-4">
              <button 
                onClick={handleBuyPremium}
                className="w-full bg-[#0FAE96] text-white font-raleway font-semibold text-base px-6 py-2 rounded-md h-10 transition duration-200 hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#0FAE96]"
              >
                <Crown className="mr-2 h-4 w-4 inline" />
                Buy Premium
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PremiumCard; 