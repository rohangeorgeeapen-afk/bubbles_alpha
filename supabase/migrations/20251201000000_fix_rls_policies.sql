-- Fix overly permissive RLS policies on conversation_graphs and conversation_nodes
-- These tables previously allowed ANY user to read/modify ANY record

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Allow public read access to graphs" ON conversation_graphs;
DROP POLICY IF EXISTS "Allow public insert access to graphs" ON conversation_graphs;
DROP POLICY IF EXISTS "Allow public update access to graphs" ON conversation_graphs;
DROP POLICY IF EXISTS "Allow public delete access to graphs" ON conversation_graphs;

DROP POLICY IF EXISTS "Allow public read access to nodes" ON conversation_nodes;
DROP POLICY IF EXISTS "Allow public insert access to nodes" ON conversation_nodes;
DROP POLICY IF EXISTS "Allow public update access to nodes" ON conversation_nodes;
DROP POLICY IF EXISTS "Allow public delete access to nodes" ON conversation_nodes;

-- Create secure policies for conversation_graphs
-- Users can only access their own graphs (or anonymous graphs they created)
CREATE POLICY "Users can view their own graphs"
  ON conversation_graphs FOR SELECT
  USING (
    auth.uid() = user_id 
    OR (user_id IS NULL AND auth.uid() IS NULL)
  );

CREATE POLICY "Users can insert their own graphs"
  ON conversation_graphs FOR INSERT
  WITH CHECK (
    auth.uid() = user_id 
    OR (user_id IS NULL AND auth.uid() IS NULL)
  );

CREATE POLICY "Users can update their own graphs"
  ON conversation_graphs FOR UPDATE
  USING (
    auth.uid() = user_id 
    OR (user_id IS NULL AND auth.uid() IS NULL)
  );

CREATE POLICY "Users can delete their own graphs"
  ON conversation_graphs FOR DELETE
  USING (
    auth.uid() = user_id 
    OR (user_id IS NULL AND auth.uid() IS NULL)
  );

-- Create secure policies for conversation_nodes
-- Access is controlled through the parent graph's ownership
CREATE POLICY "Users can view nodes of their own graphs"
  ON conversation_nodes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversation_graphs 
      WHERE conversation_graphs.id = conversation_nodes.graph_id
      AND (
        auth.uid() = conversation_graphs.user_id 
        OR (conversation_graphs.user_id IS NULL AND auth.uid() IS NULL)
      )
    )
  );

CREATE POLICY "Users can insert nodes to their own graphs"
  ON conversation_nodes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversation_graphs 
      WHERE conversation_graphs.id = graph_id
      AND (
        auth.uid() = conversation_graphs.user_id 
        OR (conversation_graphs.user_id IS NULL AND auth.uid() IS NULL)
      )
    )
  );

CREATE POLICY "Users can update nodes of their own graphs"
  ON conversation_nodes FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM conversation_graphs 
      WHERE conversation_graphs.id = conversation_nodes.graph_id
      AND (
        auth.uid() = conversation_graphs.user_id 
        OR (conversation_graphs.user_id IS NULL AND auth.uid() IS NULL)
      )
    )
  );

CREATE POLICY "Users can delete nodes of their own graphs"
  ON conversation_nodes FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM conversation_graphs 
      WHERE conversation_graphs.id = conversation_nodes.graph_id
      AND (
        auth.uid() = conversation_graphs.user_id 
        OR (conversation_graphs.user_id IS NULL AND auth.uid() IS NULL)
      )
    )
  );
