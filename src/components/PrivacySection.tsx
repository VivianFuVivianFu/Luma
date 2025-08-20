import React, { useState } from 'react';
import { Shield, Lock, Eye, Download, Trash2, ChevronDown, ChevronUp, Database, Server } from 'lucide-react';

const PrivacySection: React.FC = () => {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const privacySections = [
    {
      id: 'encryption',
      title: 'End-to-End Encryption',
      icon: <Lock className="w-4 h-4" />,
      summary: 'Bank-level security for all your conversations',
      details: 'All messages are encrypted using AES-256 encryption before being stored. Your conversations are protected with the same security standards used by financial institutions.'
    },
    {
      id: 'data-control',
      title: 'Your Data, Your Control',
      icon: <Database className="w-4 h-4" />,
      summary: 'Full ownership of your personal information',
      details: 'You have complete control over your data. Download your conversation history at any time, or permanently delete your account and all associated data with one click.'
    },
    {
      id: 'storage',
      title: 'Secure Cloud Storage',
      icon: <Server className="w-4 h-4" />,
      summary: 'Hosted on enterprise-grade infrastructure',
      details: 'Your data is stored on Supabase\'s secure cloud infrastructure with automatic backups, 99.9% uptime guarantee, and SOC 2 compliance.'
    }
  ];

  return (
    <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
      <div className="flex items-center space-x-3 mb-4">
        <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
          <Shield className="w-4 h-4 text-green-600" />
        </div>
        <h3 className="font-semibold text-gray-800">Data & Privacy</h3>
      </div>
      
      <p className="text-sm text-gray-600 mb-4">
        Your privacy and data security are our top priorities. Here's how we protect you.
      </p>

      {/* Privacy Sections */}
      <div className="space-y-3 mb-4">
        {privacySections.map((section) => (
          <div key={section.id} className="border border-gray-200 rounded-lg">
            <button
              onClick={() => toggleSection(section.id)}
              className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <div className="text-green-600">
                  {section.icon}
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-800">{section.title}</h4>
                  <p className="text-xs text-gray-500">{section.summary}</p>
                </div>
              </div>
              {expandedSection === section.id ? (
                <ChevronUp className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              )}
            </button>
            
            {expandedSection === section.id && (
              <div className="px-4 pb-3 border-t border-gray-100">
                <p className="text-sm text-gray-600 mt-2 leading-relaxed">
                  {section.details}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Data Control Actions */}
      <div className="space-y-2">
        <button className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-sm">
          <Download className="w-4 h-4" />
          <span>Download My Data</span>
        </button>
        
        <button className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors text-sm">
          <Trash2 className="w-4 h-4" />
          <span>Delete All Data</span>
        </button>
      </div>

      {/* Privacy Policy Link */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <button className="flex items-center space-x-2 text-sm text-blue-600 hover:text-blue-700 transition-colors">
          <Eye className="w-4 h-4" />
          <span>View Privacy Policy</span>
        </button>
      </div>

      {/* Trust Indicators */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="text-center p-2 bg-gray-50 rounded-lg">
          <div className="text-xs font-medium text-gray-800">GDPR</div>
          <div className="text-xs text-gray-600">Compliant</div>
        </div>
        <div className="text-center p-2 bg-gray-50 rounded-lg">
          <div className="text-xs font-medium text-gray-800">SOC 2</div>
          <div className="text-xs text-gray-600">Certified</div>
        </div>
      </div>
    </div>
  );
};

export default PrivacySection;