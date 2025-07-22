-- ウェイクワード学習データテーブル
-- 単一責任原則：ウェイクワード学習状態・特徴量データのみを管理

CREATE TABLE IF NOT EXISTS wake_word_training (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  audio_features JSONB NOT NULL,
  training_count INTEGER NOT NULL DEFAULT 0,
  is_trained BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_wake_word_training_user_id ON wake_word_training(user_id);
CREATE INDEX IF NOT EXISTS idx_wake_word_training_is_trained ON wake_word_training(is_trained);

-- RLS (Row Level Security) 設定
ALTER TABLE wake_word_training ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分のデータのみアクセス可能
DROP POLICY IF EXISTS "Users can only access their own wake word training data" ON wake_word_training;
CREATE POLICY "Users can only access their own wake word training data"
ON wake_word_training
FOR ALL
USING (auth.uid() = user_id);

-- サービスロールは全データアクセス可能
DROP POLICY IF EXISTS "Service role can access all wake word training data" ON wake_word_training;
CREATE POLICY "Service role can access all wake word training data"
ON wake_word_training
FOR ALL
USING (auth.role() = 'service_role');

-- コメント追加
COMMENT ON TABLE wake_word_training IS 'ジャーニーウェイクワード学習データ管理テーブル';
COMMENT ON COLUMN wake_word_training.user_id IS 'ユーザーID（外部キー）';
COMMENT ON COLUMN wake_word_training.audio_features IS '音声特徴量データ（MFCC、エネルギー等）';
COMMENT ON COLUMN wake_word_training.training_count IS '学習回数（最大3回）';
COMMENT ON COLUMN wake_word_training.is_trained IS '学習完了フラグ（3回完了時にtrue）';
