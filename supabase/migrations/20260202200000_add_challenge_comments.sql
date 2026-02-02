-- Migration: Add challenge_comments junction table for comments on challenges

-- Create the junction table
CREATE TABLE IF NOT EXISTS "public"."challenge_comments" (
    "challenge_id" uuid NOT NULL,
    "comment_id" uuid NOT NULL,
    CONSTRAINT "challenge_comments_pkey" PRIMARY KEY ("challenge_id", "comment_id"),
    CONSTRAINT "challenge_comments_challenge_id_fkey" FOREIGN KEY ("challenge_id") 
        REFERENCES "public"."challenges"("id") ON DELETE CASCADE,
    CONSTRAINT "challenge_comments_comment_id_fkey" FOREIGN KEY ("comment_id") 
        REFERENCES "public"."comments"("id") ON DELETE CASCADE
);

ALTER TABLE "public"."challenge_comments" OWNER TO "supabase_admin";

-- Enable RLS
ALTER TABLE "public"."challenge_comments" ENABLE ROW LEVEL SECURITY;

-- Policies for challenge_comments

-- Anyone can view challenge comments (challenges are public)
CREATE POLICY "Challenge comments are viewable by everyone" 
ON "public"."challenge_comments" 
FOR SELECT 
TO anon, authenticated
USING (true);

-- Authenticated users can add comments
CREATE POLICY "Authenticated users can add challenge comments" 
ON "public"."challenge_comments" 
FOR INSERT 
TO authenticated
WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- Users can delete their own comments, admins can delete any
CREATE POLICY "Users or admins can delete challenge comments" 
ON "public"."challenge_comments" 
FOR DELETE 
TO authenticated
USING (
    (EXISTS (
        SELECT 1 FROM "public"."comments"
        WHERE comments.id = challenge_comments.comment_id
        AND comments.user_id = (SELECT auth.uid())
    ))
    OR
    (EXISTS (
        SELECT 1 FROM "public"."profiles"
        WHERE profiles.id = (SELECT auth.uid())
        AND profiles.is_admin = true
    ))
);

-- Grant permissions
GRANT SELECT, INSERT, DELETE ON TABLE "public"."challenge_comments" TO "anon";
GRANT SELECT, INSERT, DELETE ON TABLE "public"."challenge_comments" TO "authenticated";
GRANT SELECT, INSERT, DELETE ON TABLE "public"."challenge_comments" TO "service_role";

-- Create helper function to add a comment to a challenge
CREATE OR REPLACE FUNCTION "public"."add_challenge_comment"(
    "p_challenge_id" uuid,
    "p_comment_text" text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_comment_id UUID;
    v_user_id UUID;
BEGIN
    -- Get current user
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    -- Verify challenge exists
    IF NOT EXISTS (SELECT 1 FROM "public"."challenges" WHERE id = p_challenge_id) THEN
        RAISE EXCEPTION 'Challenge not found';
    END IF;

    -- Create the comment
    INSERT INTO "public"."comments" (user_id, comment_text)
    VALUES (v_user_id, p_comment_text)
    RETURNING id INTO v_comment_id;

    -- Link to challenge
    INSERT INTO "public"."challenge_comments" (challenge_id, comment_id)
    VALUES (p_challenge_id, v_comment_id);

    RETURN v_comment_id;
END;
$$;

ALTER FUNCTION "public"."add_challenge_comment"(uuid, text) OWNER TO "supabase_admin";
COMMENT ON FUNCTION "public"."add_challenge_comment" IS 'Creates a comment and links it to a challenge';

-- Add email type for challenge comment notifications (if not exists)
INSERT INTO "public"."email_types" (type_key, type_label, description)
VALUES ('challenge_comment', 'Challenge comments', 'Notifications when someone comments on a challenge you participated in')
ON CONFLICT (type_key) DO NOTHING;
