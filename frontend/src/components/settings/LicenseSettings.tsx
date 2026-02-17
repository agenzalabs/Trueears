import React, { useState, useEffect } from 'react';
import { paymentService } from '../../services/paymentService';
import { open } from '@tauri-apps/plugin-shell';

interface LicenseSettingsProps {
  theme: 'light' | 'dark';
  isAuthenticated?: boolean;
  login?: () => Promise<void>;
}

interface LicenseStatus {
  valid: boolean;
  license_key?: string;
  product_name?: string;
  variant_name?: string;
  activations_used?: number;
  activations_limit?: number;
  expires_at?: string | null;
}

export const LicenseSettings: React.FC<LicenseSettingsProps> = ({
  theme,
  isAuthenticated = true,
  login,
}) => {
  const [licenseStatus, setLicenseStatus] = useState<LicenseStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);
  const [licenseKey, setLicenseKey] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const isDark = theme === 'dark';

  // Variant IDs from your LemonSqueezy products
  const VARIANT_ID_BASIC =
    import.meta.env.VITE_LEMONSQUEEZY_VARIANT_ID_BASIC ||
    import.meta.env.VITE_LEMONSQUEEZY_VARIANT_ID_BASIC_MONTHLY ||
    import.meta.env.VITE_LEMONSQUEEZY_VARIANT_ID_BASIC_ANNUAL ||
    '';
  const VARIANT_ID_PRO =
    import.meta.env.VITE_LEMONSQUEEZY_VARIANT_ID_PRO ||
    import.meta.env.VITE_LEMONSQUEEZY_VARIANT_ID_PRO_MONTHLY ||
    import.meta.env.VITE_LEMONSQUEEZY_VARIANT_ID_PRO_ANNUAL ||
    '';

  useEffect(() => {
    if (isAuthenticated) {
      checkLicense();
    } else {
      setLoading(false);
      setLicenseStatus({ valid: false });
    }
  }, [isAuthenticated]);

  const checkLicense = async () => {
    try {
      setLoading(true);
      setError(null);
      const status = await paymentService.checkLicenseStatus();
      setLicenseStatus(status);
    } catch (err) {
      console.error('Failed to check license:', err);
      setError('Failed to check license status');
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (tier: 'basic' | 'pro') => {
    if (!isAuthenticated) {
      setError('Please sign in first to purchase a license.');
      return;
    }

    try {
      setError(null);
      setSuccess(null);

      const variantId = tier === 'basic' ? VARIANT_ID_BASIC : VARIANT_ID_PRO;

      if (!variantId) {
        setError('Product configuration missing. Please contact support.');
        return;
      }

      const checkoutUrl = await paymentService.createCheckout(variantId);

      // Open checkout in browser
      await open(checkoutUrl);

      setSuccess('Checkout opened in browser. Complete your purchase and return here to activate your license.');
    } catch (err: any) {
      console.error('Purchase failed:', err);
      setError(err.message || 'Failed to create checkout');
    }
  };

  const handleActivate = async () => {
    if (!isAuthenticated) {
      setError('Please sign in first to activate your license.');
      return;
    }

    if (!licenseKey.trim()) {
      setError('Please enter a license key');
      return;
    }

    try {
      setActivating(true);
      setError(null);
      setSuccess(null);

      const result = await paymentService.activateLicense(
        licenseKey.trim(),
        'Trueears Desktop'
      );

      setSuccess('License activated successfully!');
      setLicenseKey('');

      // Refresh license status
      await checkLicense();
    } catch (err: any) {
      console.error('Activation failed:', err);
      setError(err.message || 'Failed to activate license');
    } finally {
      setActivating(false);
    }
  };

  const handleDeactivate = async () => {
    if (!confirm('Are you sure you want to deactivate your license on this device?')) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      await paymentService.deactivateLicense();
      setSuccess('License deactivated successfully');
      await checkLicense();
    } catch (err: any) {
      console.error('Deactivation failed:', err);
      setError(err.message || 'Failed to deactivate license');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !licenseStatus) {
    return (
      <div className="p-8">
        <div className={`text-center ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
          Loading license information...
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-6">
        <h2 className={`text-2xl font-bold mb-2 ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>
          License & Pricing
        </h2>
        <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
          Manage your Trueears license and upgrade options
        </p>
      </div>

      {!isAuthenticated && (
        <div className={`mb-6 p-4 rounded-lg border ${isDark ? 'bg-yellow-500/10 border-yellow-500/20' : 'bg-yellow-50 border-yellow-200'}`}>
          <p className={`text-sm ${isDark ? 'text-yellow-300' : 'text-yellow-700'}`}>
            Sign in is required for purchase and license activation.
          </p>
          {login && (
            <button
              onClick={() => void login()}
              className={`mt-3 px-4 py-2 rounded-lg text-sm font-medium ${
                isDark ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'
              }`}
            >
              Sign in with Google
            </button>
          )}
        </div>
      )}

      {/* Error/Success Messages */}
      {error && (
        <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20">
          <p className="text-red-500 text-sm">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 rounded-lg bg-green-500/10 border border-green-500/20">
          <p className="text-green-500 text-sm">{success}</p>
        </div>
      )}

      {/* Current License Status */}
      {licenseStatus?.valid ? (
        <div className={`mb-8 p-6 rounded-lg border ${isDark ? 'bg-[#1a1a1a] border-[#333]' : 'bg-gray-50 border-gray-200'}`}>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <svg className="w-6 h-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className={`text-xl font-semibold ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>
                  Active License
                </h3>
              </div>

              <div className={`space-y-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                {licenseStatus.product_name && (
                  <p>
                    <span className="font-medium">Plan:</span> {licenseStatus.product_name}
                    {licenseStatus.variant_name && ` - ${licenseStatus.variant_name}`}
                  </p>
                )}
                {licenseStatus.license_key && (
                  <p>
                    <span className="font-medium">Key:</span>{' '}
                    <code className={`px-2 py-1 rounded text-sm ${isDark ? 'bg-[#0a0a0a]' : 'bg-white'}`}>
                      {licenseStatus.license_key}
                    </code>
                  </p>
                )}
                {licenseStatus.activations_used !== undefined && licenseStatus.activations_limit && (
                  <p>
                    <span className="font-medium">Activations:</span>{' '}
                    {licenseStatus.activations_used} / {licenseStatus.activations_limit} devices
                  </p>
                )}
                {licenseStatus.expires_at && (
                  <p>
                    <span className="font-medium">Expires:</span>{' '}
                    {new Date(licenseStatus.expires_at).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>

            <button
              onClick={handleDeactivate}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isDark
                  ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                  : 'bg-red-50 text-red-600 hover:bg-red-100'
              }`}
            >
              Deactivate
            </button>
          </div>
        </div>
      ) : (
        /* Pricing Cards */
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Basic License */}
          <div className={`p-6 rounded-lg border ${isDark ? 'bg-[#1a1a1a] border-[#333]' : 'bg-gray-50 border-gray-200'}`}>
            <div className="mb-4">
              <h3 className={`text-xl font-bold mb-2 ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>
                Basic License
              </h3>
              <div className="flex items-baseline gap-2 mb-4">
                <span className={`text-4xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>
                  $49
                </span>
                <span className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  one-time
                </span>
              </div>
            </div>

            <ul className={`space-y-3 mb-6 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              <li className="flex items-start gap-2">
                <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Unlimited transcription</span>
              </li>
              <li className="flex items-start gap-2">
                <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Multi-language support</span>
              </li>
              <li className="flex items-start gap-2">
                <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>App profiles</span>
              </li>
              <li className="flex items-start gap-2">
                <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>2 device activations</span>
              </li>
            </ul>

            <button
              onClick={() => handlePurchase('basic')}
              disabled={!isAuthenticated}
              className={`w-full py-3 rounded-lg font-medium transition-colors ${
                !isAuthenticated
                  ? isDark ? 'bg-[#333] text-gray-500 cursor-not-allowed' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : isDark
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
              }`}
            >
              Purchase Basic
            </button>
          </div>

          {/* Pro License */}
          <div className={`p-6 rounded-lg border-2 ${isDark ? 'bg-[#1a1a1a] border-blue-500' : 'bg-blue-50 border-blue-500'} relative`}>
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-bold">
                POPULAR
              </span>
            </div>

            <div className="mb-4">
              <h3 className={`text-xl font-bold mb-2 ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>
                Pro License
              </h3>
              <div className="flex items-baseline gap-2 mb-4">
                <span className={`text-4xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>
                  $99
                </span>
                <span className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  one-time
                </span>
              </div>
            </div>

            <ul className={`space-y-3 mb-6 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              <li className="flex items-start gap-2">
                <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="font-medium">Everything in Basic, plus:</span>
              </li>
              <li className="flex items-start gap-2">
                <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>LLM post-processing</span>
              </li>
              <li className="flex items-start gap-2">
                <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Advanced formatting</span>
              </li>
              <li className="flex items-start gap-2">
                <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Priority support</span>
              </li>
              <li className="flex items-start gap-2">
                <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>5 device activations</span>
              </li>
            </ul>

            <button
              onClick={() => handlePurchase('pro')}
              disabled={!isAuthenticated}
              className={`w-full py-3 rounded-lg font-medium transition-colors ${
                !isAuthenticated
                  ? isDark ? 'bg-[#333] text-gray-500 cursor-not-allowed' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              Purchase Pro
            </button>
          </div>
        </div>
      )}

      {/* Activate License Section */}
      <div className={`p-6 rounded-lg border ${isDark ? 'bg-[#1a1a1a] border-[#333]' : 'bg-gray-50 border-gray-200'}`}>
        <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>
          Activate License Key
        </h3>
        <p className={`mb-4 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
          Already have a license key? Enter it below to activate on this device.
        </p>

        <div className="flex gap-3">
          <input
            type="text"
            value={licenseKey}
            onChange={(e) => setLicenseKey(e.target.value)}
            placeholder="XXXX-XXXX-XXXX-XXXX"
            className={`flex-1 px-4 py-2 rounded-lg border ${
              isDark
                ? 'bg-[#0a0a0a] border-[#333] text-gray-100 placeholder-gray-500'
                : 'bg-white border-gray-300 text-gray-800 placeholder-gray-400'
            } focus:outline-none focus:ring-2 focus:ring-blue-500`}
            disabled={activating}
          />
          <button
            onClick={handleActivate}
            disabled={activating || !licenseKey.trim()}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              activating || !licenseKey.trim() || !isAuthenticated
                ? isDark
                  ? 'bg-[#333] text-gray-500 cursor-not-allowed'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : isDark
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-green-500 hover:bg-green-600 text-white'
            }`}
          >
            {activating ? 'Activating...' : 'Activate'}
          </button>
        </div>
      </div>

      {/* Help Text */}
      <div className={`mt-6 p-4 rounded-lg ${isDark ? 'bg-blue-500/10' : 'bg-blue-50'}`}>
        <p className={`text-sm ${isDark ? 'text-blue-400' : 'text-blue-700'}`}>
          <strong>Note:</strong> After purchasing, you'll receive your license key via email.
          Return here to activate it on this device.
        </p>
      </div>
    </div>
  );
};
