import { FaBuilding, FaMapMarkerAlt, FaCode, FaPaperPlane, FaCheck, FaSpinner, FaExclamationTriangle } from 'react-icons/fa';

// Status type for per-company tracking
type EmailStatus = 'pending' | 'sending' | 'sent' | 'failed';

interface CompanyCardProps {
  company: string;
  email: string;
  location: string;
  title: string;
  status: EmailStatus; // Per-company status instead of global isSending/isSent
}

const CompanyCard = ({ company, email, location, title, status }: CompanyCardProps) => {
  // Don't render the card if email is "Not found"
  if (email === "Not found") {
    return null;
  }

  // Get status-specific styles
  const getStatusStyles = () => {
    switch (status) {
      case 'sent':
        return 'bg-green-600/90 hover:bg-green-600';
      case 'sending':
        return 'bg-[#0FAE96]/90 hover:bg-[#0FAE96] animate-pulse';
      case 'failed':
        return 'bg-red-600/90 hover:bg-red-600';
      default:
        return 'bg-gray-600/90 hover:bg-gray-600';
    }
  };

  // Render status content
  const renderStatusContent = () => {
    switch (status) {
      case 'sending':
        return (
          <>
            <FaSpinner className="animate-spin" />
            <span>Sending to {email}...</span>
          </>
        );
      case 'sent':
        return (
          <>
            <FaCheck />
            <span>Email Sent Successfully!</span>
          </>
        );
      case 'failed':
        return (
          <>
            <FaExclamationTriangle />
            <span>Failed to send</span>
          </>
        );
      default: // pending
        return (
          <>
            <FaPaperPlane />
            <span>Waiting to send...</span>
          </>
        );
    }
  };

  return (
    <div className={`bg-[rgba(255,255,255,0.02)] rounded-[18px] p-[30px] border transition-all backdrop-blur-sm ${status === 'sent' ? 'border-green-500/50' :
        status === 'sending' ? 'border-[#0FAE96]' :
          status === 'failed' ? 'border-red-500/50' :
            'border-[rgba(255,255,255,0.1)] hover:border-[#0FAE96]'
      }`}>
      <div className="flex items-center gap-[16px] mb-[20px]">
        <div className={`w-[40px] h-[40px] rounded-[10px] flex items-center justify-center ${status === 'sent' ? 'bg-green-600' :
            status === 'failed' ? 'bg-red-600' :
              'bg-[#0FAE96]'
          }`}>
          <FaBuilding className="text-[#FFFFFF] text-[20px]" />
        </div>
        <div>
          <h3 className="text-[28px] font-semibold text-[#ECF1F0]">{company}</h3>
          <p className="text-[#B6B6B6] text-[16px] flex items-center gap-[8px]">
            <FaMapMarkerAlt className="text-[#0FAE96]" />
            {location}
          </p>
        </div>
      </div>

      <div className="space-y-[12px] mb-[24px]">
        <div className="flex items-center gap-[12px] text-[#B6B6B6]">
          <FaCode className="text-[#0FAE96]" />
          <div className="flex flex-wrap gap-[8px]">

            <span

              className="text-[14px] bg-[rgba(255,255,255,0.05)] px-[10px] py-[6px] rounded-[10px]"
            >
              {title}
            </span>

          </div>
        </div>
      </div>

      <div
        className={`w-full px-[16px] py-[12px] rounded-[10px] flex items-center justify-center gap-[8px] transition-all backdrop-blur-sm text-[16px] text-[#FFFFFF] ${getStatusStyles()}`}
      >
        {renderStatusContent()}
      </div>
    </div>
  );
};

export default CompanyCard;