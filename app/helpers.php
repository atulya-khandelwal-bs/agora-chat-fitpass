<?php

use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use App\Services\AWS\S3\S3ClientService;
use App\Exceptions\InvalidDataException;

if (!function_exists('getLoggedInUserName')) {
    /**
     * Get the logged-in user's full name
     * Falls back to name or email if first_name/last_name are not available
     *
     * @return string
     */
    function getLoggedInUserName(): string
    {
        $user = Auth::user();
        
        if (!$user) {
            return 'System';
        }

        $firstName = trim((string) ($user->first_name ?? ''));
        $lastName = trim((string) ($user->last_name ?? ''));
        $fullName = trim($firstName . ' ' . $lastName);
        $teamMemberId = $user->team_member_id ?? null;

        $displayName = $fullName !== '' ? $fullName : (string) ($user->name ?? $user->email ?? 'System');

        if ($teamMemberId !== null && $teamMemberId !== '') {
            return $displayName . '#' . $teamMemberId;
        }

        return $displayName;
    }
}

if (!function_exists('getUserSubscriptionEndDate')) {
    /**
     * Get user's subscription end date for product_type = 2
     *
     * @param int $userId
     * @return string|null
     */
    function getUserSubscriptionEndDate(int $userId): ?string
    {
        $result = DB::select('
            SELECT MAX(end_date) as latest_end_date 
            FROM fitpass_product_cycles 
            WHERE user_id = ? AND active_status = 2 AND product_type = 2
        ', [$userId]);

        return $result[0]->latest_end_date ?? null;
    }

    /**
     * Get user's subscription end date for product_type = 2 (only reads, doesn't enforce day boundaries)
     * Returns the raw date string from DB
     *
     * @param int $userId
     * @return string|null
     */
    function getUserSubscriptionEndDateRaw(int $userId): ?string
    {
        $result = DB::select('
            SELECT MAX(end_date) as latest_end_date 
            FROM fitpass_product_cycles 
            WHERE user_id = ? AND active_status = 2
        ', [$userId]);

        return $result[0]->latest_end_date ?? null;
    }
}

if (!function_exists('uploadFile')) {
    /**
     * Upload a file to S3
     *
     * @param \Illuminate\Http\UploadedFile $file
     * @param string $uploadPath The S3 path prefix (e.g., 'health-coaches')
     * @param array $additionalTypes Additional allowed MIME types
     * @param string $fileName Optional custom file name
     * @return string The S3 path of the uploaded file
     * @throws InvalidDataException
     */
    function uploadFile($file, $uploadPath, $additionalTypes = [], $fileName = '')
    {
        $s3ClientService = app()->make(S3ClientService::class);
        $mimeType = $file->getClientMimeType();

        if (
            !in_array($mimeType, array_merge([
                'image/jpeg',
                'image/jpg',
                'image/png',
                'image/gif',
                'image/tiff',
                'image/bmp',
                'image/webp',
                'image/svg+xml',
                'application/pdf',
                'application/json',
                'text/csv',
                'text/plain',
                'video/mp4',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            ], $additionalTypes))
        ) {
            throw new InvalidDataException(
                "File of {$mimeType} is not allowed. Please use another file format."
            );
        }

        $s3Path = $uploadPath . '/' . ($fileName ? str_replace(' ', '_', $fileName) :
            time()) . '-' . strtolower(Str::random(20)) . '.' . $file->getClientOriginalExtension();

        // Use file content with Body parameter instead of SourceFile for better reliability
        $bucket = config('filesystems.disks.s3.image_bucket');
        
        // Get file content - Laravel's UploadedFile has getContent() method
        if (method_exists($file, 'getContent')) {
            $fileContent = $file->getContent();
        } else {
            // Fallback for older Laravel versions
            $filePath = $file->getRealPath();
            if (!$filePath || !file_exists($filePath)) {
                throw new InvalidDataException("Uploaded file path is invalid or file does not exist");
            }
            $fileContent = file_get_contents($filePath);
        }
        
        if ($fileContent === false || $fileContent === null || empty($fileContent)) {
            throw new InvalidDataException("Failed to read file content for upload");
        }

        // Upload to S3
        try {
            $s3ClientService->uploadFileContent($bucket, $s3Path, $fileContent, $mimeType);
            
            // Wait a moment for S3 eventual consistency
            sleep(1);
            
        } catch (\Exception $e) {
            throw new InvalidDataException("Failed to upload file to S3: " . $e->getMessage());
        }

        // Verify upload with retry logic (S3 eventual consistency)
        $maxRetries = 3;
        $retryCount = 0;
        $objectExists = false;
        
        while ($retryCount < $maxRetries && !$objectExists) {
            $objectExists = $s3ClientService->doesObjectExist($bucket, $s3Path);
            
            if (!$objectExists && $retryCount < $maxRetries - 1) {
                $retryCount++;
                sleep(1);
            } else {
                $retryCount++;
            }
        }
        
        if (!$objectExists) {
            throw new InvalidDataException("File failed to upload to S3 - object not found after upload");
        }

        return $s3Path;
    }
}
