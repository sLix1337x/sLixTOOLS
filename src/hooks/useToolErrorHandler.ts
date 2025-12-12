import { useCallback } from 'react';
import { toast } from 'sonner';
import errorLogger, { ErrorCategory } from '@/utils/errorLogger';

/**
 * Options for the tool error handler
 */
export interface ToolErrorHandlerOptions {
    componentName: string;
    showToast?: boolean;
    showDetailsAction?: boolean;
}

/**
 * Hook for standardized error handling in tool pages
 * Provides consistent error logging, categorization, and user feedback
 * 
 * @param options - Configuration options
 * @returns Object with handleError function
 */
export const useToolErrorHandler = (options: ToolErrorHandlerOptions) => {
    const handleError = useCallback((
        error: Error | unknown,
        context: string,
        additionalData?: import('@/types/common').ErrorMetadata
    ): string => {
        const err = error instanceof Error ? error : new Error(String(error));
        const errorMessage = err.message || 'Unknown error occurred';

        // Determine error category from message content
        let errorCategory = ErrorCategory.FILE_PROCESSING;
        const lowerMsg = errorMessage.toLowerCase();
        if (lowerMsg.includes('memory')) {
            errorCategory = ErrorCategory.MEMORY;
        } else if (lowerMsg.includes('worker') || lowerMsg.includes('timeout')) {
            errorCategory = ErrorCategory.WORKER;
        }

        // Log error
        const errorId = errorLogger.logError({
            category: errorCategory,
            message: `${context}: ${errorMessage}`,
            stack: err.stack,
            context: {
                component: options.componentName,
                action: context,
                userAgent: navigator.userAgent,
                url: window.location.href,
                ...additionalData
            }
        });

        // Show toast notification
        if (options.showToast !== false) {
            toast.error(`${context} Failed`, {
                description: errorMessage,
                ...(options.showDetailsAction && {
                    action: {
                        label: 'View Details',
                        onClick: () => {
                            const errorDetails = errorLogger.getLogById(errorId);
                            if (errorDetails) {
                                console.error('Error Details:', errorDetails);
                            }
                        }
                    }
                })
            });
        }

        return errorId;
    }, [options]);

    return { handleError };
};
