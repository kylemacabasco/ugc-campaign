-- Check campaigns ready for auto-distribution
SELECT 
  id, 
  title, 
  status, 
  distributed, 
  ended_at,
  (NOW() - ended_at) as time_since_ended
FROM campaigns
WHERE status = 'ended' 
  AND distributed = false 
  AND ended_at IS NOT NULL
  AND ended_at <= NOW() - INTERVAL '24 hours';

-- Check if they have approved submissions
SELECT 
  c.id as campaign_id,
  c.title,
  COUNT(s.id) as submission_count,
  SUM(s.earned_amount) as total_owed
FROM campaigns c
LEFT JOIN submissions s ON s.campaign_id = c.id AND s.status = 'approved' AND s.earned_amount > 0
WHERE c.status = 'ended' 
  AND c.distributed = false 
  AND c.ended_at IS NOT NULL
  AND c.ended_at <= NOW() - INTERVAL '24 hours'
GROUP BY c.id, c.title;
