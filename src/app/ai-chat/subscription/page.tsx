import { SubscriptionPanel } from "../_components/subscription-panel";

export default function SubscriptionPage() {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex-shrink-0 border-b border-gray-200 bg-white px-6 py-4">
        <h1 className="text-3xl font-bold text-gray-900">Subscription</h1>
        <p className="mt-2 text-gray-600">
          Manage your subscription and upgrade to unlock unlimited access to all
          features.
        </p>
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        <SubscriptionPanel />
      </div>
    </div>
  );
}
