import React from 'react';
import { ChevronLeft, Shield, Lock, Cloud, Database } from 'lucide-react';

const Section = ({ icon: Icon, title, children }) => (
  <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm space-y-3">
    <div className="flex items-center gap-3 mb-2">
      <div className="p-2 bg-[var(--accent-50)] dark:bg-gray-800 text-[var(--accent-600)] dark:text-[var(--accent-400)] rounded-lg">
        <Icon size={20} />
      </div>
      <h3 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h3>
    </div>
    <div className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed space-y-2">
      {children}
    </div>
  </div>
);

const PrivacyPolicy = ({ navigate }) => {
  return (
    <div className="pb-24 animate-slideUp bg-[#F3F4F6] dark:bg-gray-950 min-h-screen">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 sticky top-0 bg-[#F3F4F6]/95 dark:bg-gray-950/95 backdrop-blur-md z-20 border-b border-gray-200/50 dark:border-gray-800/50 flex items-center gap-3">
        <button 
          onClick={() => navigate('about')} 
          className="p-2 -ml-2 text-[var(--accent-500)] rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Privacy Policy</h1>
      </div>

      <div className="p-6 space-y-6 max-w-2xl mx-auto">
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
          Last Updated: {new Date().toLocaleDateString()}
        </p>

        <Section icon={Database} title="Local-First Architecture">
          <p>
            **Your data belongs to you.** This application operates on a "Local-First" basis. All journal entries, photos, and settings are stored locally on your device using IndexedDB.
          </p>
          <p>
            We do not have a central server. We cannot read, analyze, or sell your personal data because we never possess it. It stays on your phone or computer.
          </p>
        </Section>

        <Section icon={Cloud} title="Cloud Backups">
          <p>
            Cloud features are completely optional. If you choose to enable backups:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              **Google Drive:** We use the `drive.file` scope, meaning the app can <strong>only</strong> access files it created itself. We cannot see your other personal files or photos in Google Drive.
            </li>
            <li>
              **Cloudflare R2:** If you use R2, your credentials are saved locally in your browser's LocalStorage. They are never sent to us.
            </li>
          </ul>
        </Section>

        <Section icon={Shield} title="Data Security">
          <p>
            Since data is stored on your device, its security depends on your device's security. We recommend using a strong device passcode or biometric lock.
          </p>
          <p>
            When using Cloud Backups, your data is transmitted directly from your browser to the storage provider (Google or Cloudflare) via encrypted HTTPS connections.
          </p>
        </Section>

        <Section icon={Lock} title="Analytics & Tracking">
          <p>
            This application contains <strong>zero tracking scripts</strong>, analytics, or advertising SDKs. We do not track your usage patterns, location, or writing habits.
          </p>
        </Section>

        <div className="text-center pt-8 pb-4">
          <p className="text-xs text-gray-400">
            Built with care for privacy.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;