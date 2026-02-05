-- إصلاح آخر دالة بدون search_path (دالة ai_barcode_detection)
CREATE OR REPLACE FUNCTION public.ai_barcode_detection()
RETURNS text
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  RETURN 'AI Barcode Detection function created';
END;
$$;