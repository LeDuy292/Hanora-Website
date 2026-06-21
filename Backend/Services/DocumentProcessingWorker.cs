using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Services;

public class DocumentProcessingWorker : BackgroundService
{
    private readonly ILogger<DocumentProcessingWorker> _logger;
    private readonly IBackgroundTaskQueue _taskQueue;
    private readonly IServiceProvider _serviceProvider;

    public DocumentProcessingWorker(
        ILogger<DocumentProcessingWorker> logger,
        IBackgroundTaskQueue taskQueue,
        IServiceProvider serviceProvider)
    {
        _logger = logger;
        _taskQueue = taskQueue;
        _serviceProvider = serviceProvider;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Document Processing Worker is starting.");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                var workItem = await _taskQueue.DequeueAsync(stoppingToken);

                using var scope = _serviceProvider.CreateScope();
                await workItem(scope.ServiceProvider, stoppingToken);
            }
            catch (OperationCanceledException)
            {
                // Prevent throwing if stoppingToken was signaled
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred executing task work item.");
            }
        }

        _logger.LogInformation("Document Processing Worker is stopping.");
    }
}
