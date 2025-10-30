# Supabase Storage Setup

## Create Storage Bucket

To enable media uploads, you need to create a storage bucket in your Supabase project:

1. Go to your Supabase Dashboard
2. Navigate to **Storage** in the left sidebar
3. Click **New Bucket**
4. Set the following:
   - **Name**: `campaign-media`
   - **Public bucket**: ✅ **Yes** (so uploaded files are publicly accessible)
   - **File size limit**: 50 MB (or adjust as needed)
   - **Allowed MIME types**: Leave empty to allow all (or specify: `image/*`, `video/*`)

5. Click **Create Bucket**

## Bucket Policies (Optional)

The bucket is public by default, so no additional policies are needed for read access. The upload API uses the service role key for write access.

## Environment Variables

Make sure you have these in your `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

The service role key is needed for uploading files to storage.

