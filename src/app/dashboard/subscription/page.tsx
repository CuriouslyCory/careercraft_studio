import { SubscriptionPanel } from "~/app/dashboard/_components/subscription-panel";

export default function SubscriptionPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Subscription</h1>
        <p className="mt-2 text-gray-600">
          Manage your subscription plan and billing information.
        </p>
      </div>

      <SubscriptionPanel />
    </div>
  );
}
