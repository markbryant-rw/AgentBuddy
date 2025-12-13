/**
 * Beacon Integration Test Component
 *
 * Simple test component to verify Beacon integration module works correctly.
 *
 * Tests:
 * - Hook initialization
 * - Client setup
 * - Type safety
 * - Basic API operations
 *
 * Usage:
 * Add to a route temporarily to test integration:
 * ```tsx
 * import { BeaconIntegrationTest } from '@/components/test/BeaconIntegrationTest';
 * <BeaconIntegrationTest />
 * ```
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import {
  useBeaconClient,
  useIsBeaconEnabled,
  useBeaconIntegration,
  useBeaconHealth,
  useCreateBeaconReport,
  BeaconIntegrationError,
} from '@/lib/beacon';

export function BeaconIntegrationTest() {
  const [testPropertyId, setTestPropertyId] = useState<string>('');
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    details?: any;
  } | null>(null);

  // Test hooks
  const { client, isInitialized, error: clientError, teamId } = useBeaconClient();
  const isEnabled = useIsBeaconEnabled();
  const { data: stats, isLoading: statsLoading } = useBeaconIntegration();
  const { data: health, isError: healthError } = useBeaconHealth();
  const createReport = useCreateBeaconReport();

  /**
   * Test creating a report with dummy data
   */
  const handleTestReport = async () => {
    if (!testPropertyId) {
      setTestResult({
        success: false,
        message: 'Please enter a property ID to test',
      });
      return;
    }

    setTestResult(null);

    try {
      const response = await createReport.mutateAsync({
        agentbuddy_property_id: testPropertyId,
        report_type: 'cma',
        delivery_method: 'link',
        options: {
          include_comparables: true,
          comparable_count: 5,
        },
        metadata: {
          test: true,
          timestamp: new Date().toISOString(),
        },
      });

      setTestResult({
        success: true,
        message: 'Test report created successfully!',
        details: {
          reportId: response.report.id,
          status: response.report.status,
          type: response.report.type,
        },
      });
    } catch (error) {
      if (error instanceof BeaconIntegrationError) {
        setTestResult({
          success: false,
          message: error.message,
          details: {
            code: error.code,
            statusCode: error.statusCode,
            details: error.details,
          },
        });
      } else {
        setTestResult({
          success: false,
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Beacon Integration Test</h1>
        <p className="text-muted-foreground">
          Test the Beacon integration module and verify all components work correctly
        </p>
      </div>

      {/* Client Status */}
      <Card>
        <CardHeader>
          <CardTitle>Client Status</CardTitle>
          <CardDescription>Beacon client initialization and connection status</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium mb-1">Initialization</p>
              <Badge variant={isInitialized ? 'default' : 'secondary'}>
                {isInitialized ? (
                  <>
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Initialized
                  </>
                ) : (
                  <>
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    Initializing
                  </>
                )}
              </Badge>
            </div>

            <div>
              <p className="text-sm font-medium mb-1">Integration Enabled</p>
              <Badge variant={isEnabled ? 'default' : 'destructive'}>
                {isEnabled ? (
                  <>
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Enabled
                  </>
                ) : (
                  <>
                    <XCircle className="w-3 h-3 mr-1" />
                    Disabled
                  </>
                )}
              </Badge>
            </div>

            <div>
              <p className="text-sm font-medium mb-1">Team ID</p>
              <code className="text-xs bg-muted px-2 py-1 rounded">
                {teamId || 'Not available'}
              </code>
            </div>

            <div>
              <p className="text-sm font-medium mb-1">API Health</p>
              <Badge variant={healthError ? 'destructive' : 'default'}>
                {healthError ? (
                  <>
                    <XCircle className="w-3 h-3 mr-1" />
                    Down
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    {health?.status || 'Unknown'}
                  </>
                )}
              </Badge>
            </div>
          </div>

          {clientError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Client Error</AlertTitle>
              <AlertDescription>
                {clientError.message}
                {clientError.details && (
                  <pre className="mt-2 text-xs overflow-auto">
                    {JSON.stringify(clientError.details, null, 2)}
                  </pre>
                )}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Integration Statistics */}
      {isEnabled && (
        <Card>
          <CardHeader>
            <CardTitle>Integration Statistics</CardTitle>
            <CardDescription>Usage stats and metrics from the database</CardDescription>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : stats ? (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <p className="text-3xl font-bold">{stats.total_reports}</p>
                    <p className="text-sm text-muted-foreground">Total Reports</p>
                  </div>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-green-600">
                      {stats.reports_by_status.completed || 0}
                    </p>
                    <p className="text-sm text-muted-foreground">Completed</p>
                  </div>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-yellow-600">
                      {stats.reports_by_status.pending || 0}
                    </p>
                    <p className="text-sm text-muted-foreground">Pending</p>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium mb-2">Reports by Type</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>CMA: {stats.reports_by_type.cma || 0}</div>
                    <div>Buyer Guide: {stats.reports_by_type.buyer_guide || 0}</div>
                    <div>Seller Guide: {stats.reports_by_type.seller_guide || 0}</div>
                    <div>Market Snapshot: {stats.reports_by_type.market_snapshot || 0}</div>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium mb-1">Health Status</p>
                  <Badge
                    variant={
                      stats.health_status === 'healthy'
                        ? 'default'
                        : stats.health_status === 'degraded'
                        ? 'secondary'
                        : 'destructive'
                    }
                  >
                    {stats.health_status}
                  </Badge>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">No statistics available</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Test Report Creation */}
      {isEnabled && (
        <Card>
          <CardHeader>
            <CardTitle>Test Report Creation</CardTitle>
            <CardDescription>
              Create a test report to verify the integration works end-to-end
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label htmlFor="propertyId" className="text-sm font-medium mb-2 block">
                Property ID (from properties table)
              </label>
              <input
                id="propertyId"
                type="text"
                value={testPropertyId}
                onChange={(e) => setTestPropertyId(e.target.value)}
                placeholder="Enter agentbuddy_property_id..."
                className="w-full px-3 py-2 border rounded-md"
              />
              <p className="text-xs text-muted-foreground mt-1">
                ⚠️ Use property.id from the properties table (not appraisal.id or listing.id)
              </p>
            </div>

            <Button
              onClick={handleTestReport}
              disabled={createReport.isPending || !testPropertyId}
              className="w-full"
            >
              {createReport.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating Test Report...
                </>
              ) : (
                'Create Test Report'
              )}
            </Button>

            {testResult && (
              <Alert variant={testResult.success ? 'default' : 'destructive'}>
                {testResult.success ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                <AlertTitle>{testResult.success ? 'Success' : 'Error'}</AlertTitle>
                <AlertDescription>
                  {testResult.message}
                  {testResult.details && (
                    <pre className="mt-2 text-xs overflow-auto bg-muted p-2 rounded">
                      {JSON.stringify(testResult.details, null, 2)}
                    </pre>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Integration Setup Prompt */}
      {!isEnabled && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Integration Not Enabled</AlertTitle>
          <AlertDescription>
            Beacon integration is not enabled for your team. Please configure the integration in
            team settings to use this feature.
          </AlertDescription>
        </Alert>
      )}

      {/* Debug Info */}
      <Card>
        <CardHeader>
          <CardTitle>Debug Information</CardTitle>
          <CardDescription>Raw data for debugging</CardDescription>
        </CardHeader>
        <CardContent>
          <details>
            <summary className="cursor-pointer text-sm font-medium mb-2">
              View Raw Client Data
            </summary>
            <pre className="text-xs overflow-auto bg-muted p-4 rounded mt-2">
              {JSON.stringify(
                {
                  isInitialized,
                  isEnabled,
                  teamId,
                  hasError: !!clientError,
                  errorCode: clientError?.code,
                  stats,
                  health,
                },
                null,
                2
              )}
            </pre>
          </details>
        </CardContent>
      </Card>
    </div>
  );
}
