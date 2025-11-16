"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Recipient {
  email: string;
  name: string;
}

interface EmailCampaign {
  subject: string;
  body: string;
  footer?: string;
  campaignName?: string;
}

export default function MarketingEmailPage() {
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [emailCampaign, setEmailCampaign] = useState<EmailCampaign>({
    subject: '',
    body: '',
    footer: '',
    campaignName: ''
  });
  const [sendingStatus, setSendingStatus] = useState<{
    total: number;
    sent: number;
    failed: number;
    inProgress: boolean;
  }>({
    total: 0,
    sent: 0,
    failed: 0,
    inProgress: false
  });
  const [companyEmail, setCompanyEmail] = useState('');
  const [authStatus, setAuthStatus] = useState<'unknown' | 'authenticated' | 'unauthenticated'>('unknown');
  const [checkingAuth, setCheckingAuth] = useState(false);
  const [backendStatus, setBackendStatus] = useState<'unknown' | 'connected' | 'disconnected'>('unknown');
  const [campaignId, setCampaignId] = useState<string>('');
  const [campaignStatus, setCampaignStatus] = useState<any>(null);
  const [checkingCampaign, setCheckingCampaign] = useState(false);
  const [campaignHistory, setCampaignHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [manualCampaignId, setManualCampaignId] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check backend connectivity
  useEffect(() => {
    const checkBackendConnectivity = async () => {
      try {
        const response = await fetch('http://localhost:3001/', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (response.ok) {
          setBackendStatus('connected');
          console.log('Backend is connected');
        } else {
          setBackendStatus('disconnected');
          console.log('Backend responded but not OK');
        }
      } catch (error) {
        setBackendStatus('disconnected');
        console.error('Backend connection failed:', error);
      }
    };
    
    checkBackendConnectivity();
  }, []);

  // Check authentication when company email changes
  useEffect(() => {
    console.log('Company email changed:', companyEmail);
    console.log('Is valid email:', companyEmail ? isValidEmail(companyEmail) : false);
    
    if (companyEmail && isValidEmail(companyEmail)) {
      checkOAuth2Auth(companyEmail);
    } else {
      setAuthStatus('unknown');
    }
  }, [companyEmail]);

  // Parse CSV file
  const parseCSV = (file: File): Promise<Recipient[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const lines = text.split('\n');
          const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
          
          // Find email and name column indices
          const emailIndex = headers.findIndex(h => h.includes('email'));
          const nameIndex = headers.findIndex(h => h.includes('company name') || h.includes('full name') || h.includes('first name'));
          
          if (emailIndex === -1) {
            reject(new Error('Email column not found in CSV. Please ensure your CSV has an "email" column.'));
            return;
          }

          const recipients: Recipient[] = [];
          
          for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
            const email = values[emailIndex];
            const name = nameIndex !== -1 ? values[nameIndex] : email.split('@')[0]; // Use email prefix as name if no name column
            
            if (email && isValidEmail(email)) {
              recipients.push({ email, name });
            }
          }
          
          resolve(recipients);
        } catch (error) {
          reject(new Error('Failed to parse CSV file. Please check the file format.'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  };

  // Email validation
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isValid = emailRegex.test(email);
    console.log(`Email validation for "${email}": ${isValid}`);
    return isValid;
  };

  // Handle file upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setUploadStatus('Please upload a CSV file.');
      return;
    }

    setCsvFile(file);
    setUploadStatus('Processing CSV file...');
    setIsLoading(true);

    try {
      const parsedRecipients = await parseCSV(file);
      setRecipients(parsedRecipients);
      setUploadStatus(`Successfully loaded ${parsedRecipients.length} recipients from CSV.`);
    } catch (error) {
      setUploadStatus(error instanceof Error ? error.message : 'Failed to process CSV file.');
      setCsvFile(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Check OAuth2 authentication status
  const checkOAuth2Auth = async (email: string) => {
    try {
      setCheckingAuth(true);
      console.log('Checking authentication for email:', email);
      
      // Try to send a minimal test request to check authentication
      // We'll use a dummy request that should fail with authentication error if not authenticated
      const response = await fetch('http://localhost:3001/send-marketing-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipients: [], // Empty recipients to trigger validation error instead of auth error
          companyEmail: email,
          subject: 'Test',
          body: 'Test',
          campaignName: 'auth-test'
        }),
      });
      
      console.log('Auth check response status:', response.status);
      
      if (response.status === 401 || response.status === 403) {
        // User is not authenticated
        console.log('User is not authenticated (401/403)');
        setAuthStatus('unauthenticated');
        return false;
      }
      
      // If we get a 400 error, it might be due to validation (empty recipients)
      // rather than authentication. Let's check the error message
      if (response.status === 400) {
        try {
          const result = await response.json();
          console.log('Auth check error result:', result);
          
          // If the error mentions authentication, user is not authenticated
          if (result.error && (
            result.error.includes('authentication') || 
            result.error.includes('Authentication') ||
            result.error.includes('re-authenticate') ||
            result.error.includes('token')
          )) {
            console.log('User is not authenticated (auth error in 400)');
            setAuthStatus('unauthenticated');
            return false;
          }
          
          // If it's a validation error (like missing recipients), assume user is authenticated
          console.log('User appears to be authenticated (validation error)');
          setAuthStatus('authenticated');
          return true;
        } catch (parseError) {
          console.log('Could not parse error response, assuming not authenticated');
          setAuthStatus('unauthenticated');
          return false;
        }
      }
      
      // For any other status, assume not authenticated
      console.log('User is not authenticated (other status)');
      setAuthStatus('unauthenticated');
      return false;
    } catch (error) {
      console.error('Auth check failed:', error);
      setAuthStatus('unauthenticated');
      return false;
    } finally {
      setCheckingAuth(false);
    }
  };

  // Handle OAuth2 authentication
  const handleOAuth2Auth = (email: string) => {
    const authUrl = `http://localhost:3001/auth/google?state=candidates`;
    window.location.href = authUrl;
  };

  // Check campaign status
  const checkCampaignStatus = async (id: string) => {
    try {
      setCheckingCampaign(true);
      const response = await fetch(`http://localhost:3001/campaign-status/${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const result = await response.json();
        setCampaignStatus(result);
        console.log('Campaign status:', result);
      } else {
        console.error('Failed to get campaign status');
      }
    } catch (error) {
      console.error('Error checking campaign status:', error);
    } finally {
      setCheckingCampaign(false);
    }
  };

  // Load campaign history
  const loadCampaignHistory = async () => {
    try {
      setLoadingHistory(true);
      const response = await fetch('http://localhost:3001/campaigns', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const result = await response.json();
        setCampaignHistory(result.campaigns || []);
        console.log('Campaign history:', result.campaigns);
      } else {
        console.error('Failed to get campaign history');
      }
    } catch (error) {
      console.error('Error loading campaign history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Load history on component mount
  useEffect(() => {
    loadCampaignHistory();
  }, []);

  // Handle email campaign submission
  const handleSendEmails = async () => {
    if (!recipients.length) {
      setUploadStatus('Please upload a CSV file with recipients first.');
      return;
    }

    if (!emailCampaign.subject || !emailCampaign.body) {
      setUploadStatus('Please fill in both subject and body fields.');
      return;
    }

    if (!companyEmail) {
      setUploadStatus('Please enter your company email address.');
      return;
    }

    setSendingStatus(prev => ({ ...prev, inProgress: true, total: recipients.length }));
    setUploadStatus('Checking authentication...');

    try {
      // First check if user is authenticated
      const isAuthenticated = await checkOAuth2Auth(companyEmail);
      
      if (!isAuthenticated) {
        setSendingStatus(prev => ({ ...prev, inProgress: false }));
        setUploadStatus('Email authentication required. Please authorize your email account.');
        
        // Show authentication prompt
        if (confirm('You need to authorize your email account to send emails. Click OK to proceed with authentication.')) {
          handleOAuth2Auth(companyEmail);
        }
        return;
      }

      setUploadStatus('Starting background email campaign...');

      // Send campaign to backend for background processing
      const response = await fetch('http://localhost:3001/start-campaign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipients,
          companyEmail,
          subject: emailCampaign.subject,
          body: emailCampaign.body,
          footer: emailCampaign.footer,
          campaignName: emailCampaign.campaignName || 'Marketing Campaign',
          campaignId: `campaign_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setSendingStatus({
          total: recipients.length,
          sent: 0,
          failed: 0,
          inProgress: false
        });
        setUploadStatus(`Campaign started successfully! Campaign ID: ${result.campaignId}. Emails will be sent in the background. You can close this page.`);
        
        // Store campaign ID for status checking
        setCampaignId(result.campaignId);
        
        // Show success message with campaign details
        alert(`✅ Campaign Started Successfully!\n\nCampaign ID: ${result.campaignId}\nTotal Recipients: ${recipients.length}\n\nYour emails will be sent automatically in the background. You can safely close this page.\n\nYou can check the status later using the Campaign ID.`);
      } else {
        // Handle authentication errors
        if (response.status === 401 || response.status === 403) {
          setSendingStatus(prev => ({ ...prev, inProgress: false }));
          setUploadStatus('Authentication failed. Please re-authorize your email account.');
          
          if (confirm('Your email authentication has expired. Click OK to re-authorize.')) {
            handleOAuth2Auth(companyEmail);
          }
        } else {
          throw new Error(result.error || 'Failed to start campaign');
        }
      }
    } catch (error) {
      setSendingStatus(prev => ({ ...prev, inProgress: false }));
      setUploadStatus(error instanceof Error ? error.message : 'Failed to start campaign. Please try again.');
    }
  };

  // Reset form
  const handleReset = () => {
    setCsvFile(null);
    setRecipients([]);
    setUploadStatus('');
    setEmailCampaign({
      subject: '',
      body: '',
      footer: '',
      campaignName: ''
    });
    setSendingStatus({
      total: 0,
      sent: 0,
      failed: 0,
      inProgress: false
    });
    setCompanyEmail('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
                 <div className="text-center mb-8">
           <h1 className="text-4xl font-bold text-white mb-4">
             Marketing Email Campaign
           </h1>
           <p className="text-gray-300 text-lg">
             Upload a CSV file with recipient emails and names, then start background email campaigns
           </p>
         </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - File Upload and Recipients */}
          <div className="space-y-6">
            {/* CSV Upload Section */}
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Upload CSV File
              </h2>
              
              <div className="space-y-4">
                <div className="border-2 border-dashed border-gray-400 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={isLoading}
                  />
                  <div className="cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                    <svg className="w-12 h-12 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <p className="text-white font-medium mb-2">
                      {isLoading ? 'Processing...' : 'Click to upload CSV file'}
                    </p>
                    <p className="text-gray-400 text-sm">
                      Supports .csv files with email and name columns
                    </p>
                  </div>
                </div>

                {csvFile && (
                  <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                    <p className="text-green-400 text-sm">
                      ✓ {csvFile.name} uploaded successfully
                    </p>
                  </div>
                )}

                {uploadStatus && (
                  <div className={`p-4 rounded-lg text-sm ${
                    uploadStatus.includes('Successfully') || uploadStatus.includes('completed')
                      ? 'bg-green-500/10 border border-green-500/20 text-green-400'
                      : uploadStatus.includes('Failed') || uploadStatus.includes('error')
                      ? 'bg-red-500/10 border border-red-500/20 text-red-400'
                      : 'bg-blue-500/10 border border-blue-500/20 text-blue-400'
                  }`}>
                    {uploadStatus}
                  </div>
                )}
              </div>
            </div>

            {/* Recipients Preview */}
            {recipients.length > 0 && (
              <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  Recipients ({recipients.length})
                </h3>
                
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {recipients.slice(0, 10).map((recipient, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                      <div>
                        <p className="text-white font-medium">{recipient.name}</p>
                        <p className="text-gray-400 text-sm">{recipient.email}</p>
                      </div>
                    </div>
                  ))}
                  {recipients.length > 10 && (
                    <p className="text-gray-400 text-sm text-center py-2">
                      ... and {recipients.length - 10} more recipients
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Email Campaign Form */}
          <div className="space-y-6">
                         {/* Company Email */}
             <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
               <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
                 <svg className="w-5 h-5 mr-2 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                 </svg>
                 Sender Email
               </h2>
               
               <Input
                 type="email"
                 placeholder="your-email@company.com"
                 value={companyEmail}
                 onChange={(e) => setCompanyEmail(e.target.value)}
                 className="w-full bg-white/10 border-white/20 text-white placeholder-gray-400"
               />
               
               {/* Debug info */}
               {companyEmail && (
                 <div className="mt-2 text-xs text-gray-400">
                   <p>Email: {companyEmail}</p>
                   <p>Valid: {isValidEmail(companyEmail) ? 'Yes' : 'No'}</p>
                   <p>Backend: {backendStatus}</p>
                   <p>Auth Status: {authStatus}</p>
                 </div>
               )}
               
               {/* Authentication Status */}
               {companyEmail && isValidEmail(companyEmail) && (
                 <div className="mt-3 flex items-center space-x-2">
                   {checkingAuth ? (
                     <div className="flex items-center text-blue-400">
                       <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                         <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                         <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                       </svg>
                       <span className="text-sm">Checking authentication...</span>
                     </div>
                   ) : authStatus === 'authenticated' ? (
                     <div className="flex items-center text-green-400">
                       <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                       </svg>
                       <span className="text-sm">Email authenticated ✓</span>
                     </div>
                   ) : authStatus === 'unauthenticated' ? (
                     <div className="flex items-center text-red-400">
                       <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                       </svg>
                       <span className="text-sm">Authentication required</span>
                       <Button
                         onClick={() => handleOAuth2Auth(companyEmail)}
                         size="sm"
                         className="ml-2 bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1"
                       >
                         Authorize
                       </Button>
                     </div>
                   ) : null}
                 </div>
               )}
               
               <p className="text-gray-400 text-sm mt-2">
                 This email will be used to send the marketing campaign
               </p>
               
               {/* Debug: Manual auth test button */}
               {companyEmail && isValidEmail(companyEmail) && (
                 <div className="mt-3">
                   <Button
                     onClick={() => checkOAuth2Auth(companyEmail)}
                     size="sm"
                     className="bg-gray-600 hover:bg-gray-700 text-white text-xs px-3 py-1"
                   >
                     Test Auth Check
                   </Button>
                 </div>
               )}
             </div>

            {/* Email Campaign Form */}
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
                                 <svg className="w-5 h-5 mr-2 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                 </svg>
                 Background Email Campaign
               </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Campaign Name (Optional)
                  </label>
                  <Input
                    type="text"
                    placeholder="Summer 2024 Campaign"
                    value={emailCampaign.campaignName}
                    onChange={(e) => setEmailCampaign(prev => ({ ...prev, campaignName: e.target.value }))}
                    className="w-full bg-white/10 border-white/20 text-white placeholder-gray-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Subject Line *
                  </label>
                  <Input
                    type="text"
                    placeholder="Exciting opportunity for you!"
                    value={emailCampaign.subject}
                    onChange={(e) => setEmailCampaign(prev => ({ ...prev, subject: e.target.value }))}
                    className="w-full bg-white/10 border-white/20 text-white placeholder-gray-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Email Body *
                  </label>
                  <textarea
                    placeholder="Hi [Name], we have an exciting opportunity that matches your profile..."
                    value={emailCampaign.body}
                    onChange={(e) => setEmailCampaign(prev => ({ ...prev, body: e.target.value }))}
                    rows={6}
                    className="w-full bg-white/10 border-white/20 text-white placeholder-gray-400 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Footer (Optional)
                  </label>
                  <textarea
                    placeholder="Best regards, Your Company Team"
                    value={emailCampaign.footer}
                    onChange={(e) => setEmailCampaign(prev => ({ ...prev, footer: e.target.value }))}
                    rows={3}
                    className="w-full bg-white/10 border-white/20 text-white placeholder-gray-400 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
                             <Button
                 onClick={handleSendEmails}
                 disabled={!recipients.length || !emailCampaign.subject || !emailCampaign.body || !companyEmail || sendingStatus.inProgress || authStatus === 'unauthenticated'}
                 className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
               >
                {sendingStatus.inProgress ? (
                  <div className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Sending...
                  </div>
                                 ) : (
                   <div className="flex items-center">
                     <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                     </svg>
                     Start Background Campaign
                   </div>
                 )}
              </Button>

              <Button
                onClick={handleReset}
                variant="outline"
                className="px-6 py-3 border-white/20 text-white hover:bg-white/10"
              >
                Reset
              </Button>
            </div>

                         {/* Campaign Status */}
             {campaignId && (
               <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
                 <h3 className="text-lg font-semibold text-white mb-4 flex items-center justify-between">
                   <span>Campaign Status</span>
                   <Button
                     onClick={() => checkCampaignStatus(campaignId)}
                     disabled={checkingCampaign}
                     size="sm"
                     className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1"
                   >
                     {checkingCampaign ? 'Checking...' : 'Refresh Status'}
                   </Button>
                 </h3>
                 
                 <div className="space-y-3">
                   <div className="flex justify-between items-center">
                     <span className="text-gray-300">Campaign ID:</span>
                     <span className="text-white font-medium text-sm">{campaignId}</span>
                   </div>
                   
                   {campaignStatus ? (
                     <>
                       <div className="flex justify-between items-center">
                         <span className="text-gray-300">Status:</span>
                         <span className={`font-medium ${
                           campaignStatus.status === 'completed' ? 'text-green-400' :
                           campaignStatus.status === 'in_progress' ? 'text-yellow-400' :
                           campaignStatus.status === 'failed' ? 'text-red-400' :
                           'text-gray-400'
                         }`}>
                           {campaignStatus.status}
                         </span>
                       </div>
                       <div className="flex justify-between items-center">
                         <span className="text-gray-300">Total Recipients:</span>
                         <span className="text-white font-medium">{campaignStatus.total || 0}</span>
                       </div>
                       <div className="flex justify-between items-center">
                         <span className="text-gray-300">Successfully Sent:</span>
                         <span className="text-green-400 font-medium">{campaignStatus.sent || 0}</span>
                       </div>
                       <div className="flex justify-between items-center">
                         <span className="text-gray-300">Failed:</span>
                         <span className="text-red-400 font-medium">{campaignStatus.failed || 0}</span>
                       </div>
                       {campaignStatus.status === 'in_progress' && (
                         <div className="w-full bg-gray-700 rounded-full h-2">
                           <div 
                             className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                             style={{ 
                               width: `${campaignStatus.total > 0 ? ((campaignStatus.sent + campaignStatus.failed) / campaignStatus.total) * 100 : 0}%` 
                             }}
                           ></div>
                         </div>
                       )}
                     </>
                   ) : (
                     <div className="text-gray-400 text-sm">
                       Click "Refresh Status" to check campaign progress
                     </div>
                   )}
                 </div>
               </div>
             )}

             {/* Sending Status */}
             {sendingStatus.total > 0 && !campaignId && (
               <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
                 <h3 className="text-lg font-semibold text-white mb-4">Campaign Status</h3>
                 <div className="space-y-3">
                   <div className="flex justify-between items-center">
                     <span className="text-gray-300">Total Recipients:</span>
                     <span className="text-white font-medium">{sendingStatus.total}</span>
                   </div>
                   <div className="flex justify-between items-center">
                     <span className="text-gray-300">Successfully Sent:</span>
                     <span className="text-green-400 font-medium">{sendingStatus.sent}</span>
                   </div>
                   <div className="flex justify-between items-center">
                     <span className="text-gray-300">Failed:</span>
                     <span className="text-red-400 font-medium">{sendingStatus.failed}</span>
                   </div>
                   {sendingStatus.inProgress && (
                     <div className="w-full bg-gray-700 rounded-full h-2">
                       <div 
                         className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                         style={{ width: `${((sendingStatus.sent + sendingStatus.failed) / sendingStatus.total) * 100}%` }}
                       ></div>
                     </div>
                   )}
                 </div>
               </div>
             )}
          </div>
        </div>

                 {/* Campaign History */}
         <div className="mt-8 bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
           <h3 className="text-lg font-semibold text-white mb-4 flex items-center justify-between">
             <span className="flex items-center">
               <svg className="w-5 h-5 mr-2 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
               </svg>
               Campaign History
             </span>
             <Button
               onClick={loadCampaignHistory}
               disabled={loadingHistory}
               size="sm"
               className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1"
             >
               {loadingHistory ? 'Loading...' : 'Refresh'}
             </Button>
           </h3>
           
           {/* Manual Campaign ID Check */}
           <div className="mb-6 p-4 bg-white/5 rounded-lg border border-white/10">
             <h4 className="text-white font-medium mb-3">Check Specific Campaign</h4>
             <div className="flex gap-2">
               <Input
                 type="text"
                 placeholder="Enter Campaign ID"
                 value={manualCampaignId}
                 onChange={(e) => setManualCampaignId(e.target.value)}
                 className="flex-1 bg-white/10 border-white/20 text-white placeholder-gray-400"
               />
               <Button
                 onClick={() => {
                   if (manualCampaignId.trim()) {
                     setCampaignId(manualCampaignId.trim());
                     checkCampaignStatus(manualCampaignId.trim());
                   }
                 }}
                 disabled={!manualCampaignId.trim()}
                 size="sm"
                 className="bg-green-600 hover:bg-green-700 text-white px-4 py-2"
               >
                 Check Status
               </Button>
             </div>
           </div>
           
           {loadingHistory ? (
             <div className="flex items-center justify-center py-8">
               <svg className="animate-spin h-8 w-8 text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                 <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                 <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
               </svg>
             </div>
           ) : campaignHistory.length > 0 ? (
             <div className="space-y-4">
               {campaignHistory.map((campaign) => (
                 <div key={campaign.id} className="bg-white/5 rounded-lg p-4 border border-white/10">
                   <div className="flex justify-between items-start mb-3">
                     <div>
                       <h4 className="text-white font-medium">{campaign.campaignName || 'Unnamed Campaign'}</h4>
                       <p className="text-gray-400 text-sm font-mono">{campaign.id}</p>
                     </div>
                     <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                       campaign.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                       campaign.status === 'in_progress' ? 'bg-yellow-500/20 text-yellow-400' :
                       campaign.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                       campaign.status === 'cancelled' ? 'bg-gray-500/20 text-gray-400' :
                       'bg-blue-500/20 text-blue-400'
                     }`}>
                       {campaign.status}
                     </span>
                   </div>
                   
                   <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                     <div>
                       <span className="text-gray-400">Total:</span>
                       <span className="text-white ml-2">{campaign.total}</span>
                     </div>
                     <div>
                       <span className="text-gray-400">Sent:</span>
                       <span className="text-green-400 ml-2">{campaign.sent}</span>
                     </div>
                     <div>
                       <span className="text-gray-400">Failed:</span>
                       <span className="text-red-400 ml-2">{campaign.failed}</span>
                     </div>
                     <div>
                       <span className="text-gray-400">Started:</span>
                       <span className="text-white ml-2">
                         {new Date(campaign.startTime).toLocaleDateString()}
                       </span>
                     </div>
                   </div>
                   
                   {campaign.endTime && (
                     <div className="mt-2 text-xs text-gray-400">
                       Completed: {new Date(campaign.endTime).toLocaleString()}
                     </div>
                   )}
                   
                   <div className="mt-3 flex gap-2">
                     <Button
                       onClick={() => {
                         setCampaignId(campaign.id);
                         checkCampaignStatus(campaign.id);
                       }}
                       size="sm"
                       className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1"
                     >
                       View Details
                     </Button>
                     <Button
                       onClick={() => navigator.clipboard.writeText(campaign.id)}
                       size="sm"
                       className="bg-gray-600 hover:bg-gray-700 text-white text-xs px-3 py-1"
                     >
                       Copy ID
                     </Button>
                   </div>
                 </div>
               ))}
             </div>
           ) : (
             <div className="text-center py-8 text-gray-400">
               <svg className="w-12 h-12 mx-auto mb-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
               </svg>
               <p>No campaigns found</p>
               <p className="text-sm">Start your first campaign to see it here</p>
             </div>
           )}
         </div>

         {/* CSV Format Instructions */}
         <div className="mt-8 bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
           <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
             <svg className="w-5 h-5 mr-2 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
             </svg>
             Setup Instructions
           </h3>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div>
               <h4 className="text-white font-medium mb-2">Background Processing:</h4>
               <ul className="text-gray-300 space-y-1 text-sm">
                 <li>• Upload CSV and configure campaign</li>
                 <li>• Click "Start Background Campaign"</li>
                 <li>• Campaign runs automatically on backend</li>
                 <li>• You can close the page while emails send</li>
                 <li>• Check status using Campaign ID</li>
               </ul>
             </div>
             <div>
               <h4 className="text-white font-medium mb-2">CSV Format:</h4>
               <ul className="text-gray-300 space-y-1 text-sm">
                 <li>• <strong>email</strong> - Recipient's email address (required)</li>
                 <li>• <strong>name</strong> - Recipient's name (optional)</li>
               </ul>
               <div className="bg-gray-800 rounded-lg p-3 text-sm font-mono text-gray-300 mt-2">
                 email,name<br/>
                 john@example.com,John Doe<br/>
                 jane@example.com,Jane Smith<br/>
                 bob@example.com,Bob Johnson
               </div>
             </div>
           </div>
        </div>
      </div>
    </div>
  );
}
