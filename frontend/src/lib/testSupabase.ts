// Test file for Supabase database operations
// Run this to test your Supabase connection and database setup
// 
// ⚠️ IMPORTANT: Make sure you've run the SQL migrations first!
// 1. Run supabase/migrations/001_initial_schema.sql
// 2. Run supabase/migrations/002_rls_policies.sql

import { supabase } from "./supabaseClient";

// Test: Add a user
export const addUser = async () => {
  const { data, error } = await supabase
    .from("users")
    .insert({
      display_name: "Amaresh",
      email: "test@gmail.com",
      username: "amaresh_test",
      password: "Amaresh@1234", // ⚠️ In production, this must be hashed (bcrypt/argon2)!
    })
    .select();

  if (error) {
    console.error("Error adding user:", error);
    return { data: null, error };
  }

  console.log("✅ User added successfully:", data);
  return { data, error: null };
};

// Test: Get all users
export const getUsers = async () => {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .limit(10);

  if (error) {
    console.error("Error fetching users:", error);
    return { data: null, error };
  }

  console.log("✅ Users fetched:", data);
  return { data, error: null };
};

// Test: Get a specific user
export const getUser = async (userId: string) => {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) {
    console.error("Error fetching user:", error);
    return { data: null, error };
  }

  console.log("✅ User fetched:", data);
  return { data, error: null };
};

// Test: Update a user
export const updateUser = async (userId: string, updates: any) => {
  const { data, error } = await supabase
    .from("users")
    .update(updates)
    .eq("id", userId)
    .select();

  if (error) {
    console.error("Error updating user:", error);
    return { data: null, error };
  }

  console.log("✅ User updated:", data);
  return { data, error: null };
};

// Example usage in a component:
/*
import { addUser, getUsers } from '@/lib/testSupabase';

const TestComponent = () => {
  const handleTest = async () => {
    // Test adding a user
    await addUser();
    
    // Test getting users
    await getUsers();
  };

  return <button onClick={handleTest}>Test Supabase</button>;
};
*/

