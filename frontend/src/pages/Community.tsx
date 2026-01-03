import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Heart,
  MessageCircle,
  Share2,
  MoreVertical,
  Image as ImageIcon,
  Send,
  Loader2,
  Sparkles,
  Users,
  Trophy,
  Calendar
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDistanceToNow } from "date-fns";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Link } from "react-router-dom";

interface Post {
  id: string;
  content: string;
  image?: string;
  likeCount: number;
  commentCount: number;
  isPinned: boolean;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  isLiked: boolean;
  author: {
    id: string;
    name: string;
    username: string;
    avatar: string | null;
    isVerified: boolean;
  };
}

interface Comment {
  id: string;
  content: string;
  likeCount: number;
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    name: string;
    username: string;
    avatar: string | null;
  };
}

const communityFeatures = [
  {
    icon: MessageCircle,
    title: "Discussion Forums",
    description: "Connect with fellow viewers and creators in topic-based discussions.",
  },
  {
    icon: Users,
    title: "Creator Collabs",
    description: "Find collaboration partners and build your network.",
  },
  {
    icon: Trophy,
    title: "Challenges & Events",
    description: "Participate in community challenges and win exclusive prizes.",
  },
  {
    icon: Calendar,
    title: "Live Events",
    description: "Join live Q&As, premieres, and special community gatherings.",
  },
];

const Community = () => {
  const { user, isCreator } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPostContent, setNewPostContent] = useState("");
  const [creatingPost, setCreatingPost] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const response = await api.community.getPosts<Post[]>({ limit: 50 });
      if (response.success && response.data) {
        // Handle both array and wrapped response formats
        const postsData = Array.isArray(response.data) ? response.data : (response.data as any).data || [];
        setPosts(postsData);
      }
    } catch (error) {
      console.error("Failed to fetch posts:", error);
      toast.error("Failed to load community posts");
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePost = async () => {
    if (!newPostContent.trim()) return;

    try {
      setCreatingPost(true);
      const response = await api.community.createPost<Post>({
        content: newPostContent.trim(),
        isPublic: true,
      });

      if (response.success && response.data) {
        // Handle both direct and wrapped response formats
        const newPost = (response.data as any).data || response.data;
        setPosts([newPost, ...posts]);
        setNewPostContent("");
        toast.success("Post created successfully!");
      } else {
        toast.error(response.error?.message || "Failed to create post");
      }
    } catch (error) {
      console.error("Failed to create post:", error);
      toast.error("Failed to create post");
    } finally {
      setCreatingPost(false);
    }
  };

  const handleLikePost = async (postId: string) => {
    const post = posts.find(p => p.id === postId);
    if (!post) return;

    try {
      if (post.isLiked) {
        await api.community.unlikePost(postId);
        setPosts(posts.map(p =>
          p.id === postId
            ? { ...p, isLiked: false, likeCount: p.likeCount - 1 }
            : p
        ));
      } else {
        await api.community.likePost(postId);
        setPosts(posts.map(p =>
          p.id === postId
            ? { ...p, isLiked: true, likeCount: p.likeCount + 1 }
            : p
        ));
      }
    } catch (error) {
      console.error("Failed to toggle like:", error);
      toast.error("Failed to update like");
    }
  };

  const handleOpenComments = async (post: Post) => {
    setSelectedPost(post);
    setLoadingComments(true);
    try {
      const response = await api.community.getComments<Comment[]>(post.id);
      if (response.success && response.data) {
        // Handle both array and wrapped response formats
        const commentsData = Array.isArray(response.data) ? response.data : (response.data as any).data || [];
        setComments(commentsData);
      }
    } catch (error) {
      console.error("Failed to load comments:", error);
      toast.error("Failed to load comments");
    } finally {
      setLoadingComments(false);
    }
  };

  const handleAddComment = async () => {
    if (!selectedPost || !newComment.trim()) return;

    try {
      setSubmittingComment(true);
      const response = await api.community.createComment<Comment>(selectedPost.id, {
        content: newComment.trim(),
      });

      if (response.success && response.data) {
        // Handle both direct and wrapped response formats
        const newCommentData = (response.data as any).data || response.data;
        setComments([...comments, newCommentData]);
        setNewComment("");
        // Update comment count in the posts list
        setPosts(posts.map(p =>
          p.id === selectedPost.id
            ? { ...p, commentCount: p.commentCount + 1 }
            : p
        ));
        toast.success("Comment added!");
      } else {
        toast.error(response.error?.message || "Failed to add comment");
      }
    } catch (error) {
      console.error("Failed to add comment:", error);
      toast.error("Failed to add comment");
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleShare = (postId: string) => {
    const url = `${window.location.origin}/community/post/${postId}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard!");
  };

  const handleDeletePost = async (postId: string) => {
    try {
      const response = await api.community.deletePost(postId);
      if (response.success) {
        setPosts(posts.filter(p => p.id !== postId));
        toast.success("Post deleted");
      } else {
        toast.error(response.error?.message || "Failed to delete post");
      }
    } catch (error) {
      console.error("Failed to delete post:", error);
      toast.error("Failed to delete post");
    }
  };

  return (
    <>
      <Helmet>
        <title>Community - PassionFantasia</title>
        <meta name="description" content="Join the PassionFantasia community. Connect with creators and viewers worldwide." />
      </Helmet>

      <Layout>
        <div className="px-4 lg:px-8 py-8">
          {/* Hero */}
          <div className="text-center max-w-3xl mx-auto mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-6">
              <Sparkles className="h-4 w-4" />
              <span className="text-sm font-medium">Community Hub</span>
            </div>
            <h1 className="font-display text-3xl lg:text-4xl font-bold mb-4">
              Welcome to the <span className="gradient-text">Community</span>
            </h1>
            <p className="text-muted-foreground">
              Connect with creators, share updates, and be part of the conversation.
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
            {communityFeatures.map((feature) => (
              <div
                key={feature.title}
                className="p-4 rounded-xl bg-card border border-border text-center"
              >
                <div className="inline-flex p-2 rounded-lg bg-primary/10 mb-3">
                  <feature.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold text-sm mb-1">{feature.title}</h3>
                <p className="text-xs text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>

          {/* Create Post (Creators Only) */}
          {isCreator && (
            <div className="max-w-2xl mx-auto mb-8 p-6 rounded-xl bg-card border border-border">
              <div className="flex gap-4">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={user?.avatar || undefined} />
                  <AvatarFallback>{user?.displayName?.[0] || user?.username?.[0] || "U"}</AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-4">
                  <Textarea
                    placeholder="Share something with your community..."
                    value={newPostContent}
                    onChange={(e) => setNewPostContent(e.target.value)}
                    className="min-h-[100px] resize-none"
                  />
                  <div className="flex justify-between items-center">
                    <Button variant="ghost" size="sm" disabled>
                      <ImageIcon className="h-4 w-4 mr-2" />
                      Add Image
                    </Button>
                    <Button
                      onClick={handleCreatePost}
                      disabled={!newPostContent.trim() || creatingPost}
                    >
                      {creatingPost ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Posting...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          Post
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Posts Feed */}
          <div className="max-w-2xl mx-auto space-y-6">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : posts.length === 0 ? (
              <div className="text-center py-12">
                <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No posts yet</h3>
                <p className="text-muted-foreground">
                  {isCreator
                    ? "Be the first to share something with the community!"
                    : "Check back later for updates from your favorite creators."
                  }
                </p>
              </div>
            ) : (
              posts.map((post) => (
                <div
                  key={post.id}
                  className="p-6 rounded-xl bg-card border border-border"
                >
                  {/* Post Header */}
                  <div className="flex items-start justify-between mb-4">
                    <Link to={`/creator/${post.author.username}`} className="flex items-center gap-3 hover:opacity-80">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={post.author.avatar || undefined} />
                        <AvatarFallback>{post.author.name[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold">{post.author.name}</p>
                        <p className="text-sm text-muted-foreground">
                          @{post.author.username} · {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                    </Link>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleShare(post.id)}>
                          Share
                        </DropdownMenuItem>
                        {user && post.author.id === user.id && (
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleDeletePost(post.id)}
                          >
                            Delete
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem>Report</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Post Content */}
                  <p className="text-foreground/90 mb-4 whitespace-pre-wrap">{post.content}</p>

                  {/* Post Image */}
                  {post.image && (
                    <div className="mb-4 rounded-lg overflow-hidden">
                      <img
                        src={post.image}
                        alt="Post"
                        className="w-full h-auto object-cover"
                      />
                    </div>
                  )}

                  {/* Post Actions */}
                  <div className="flex items-center gap-6 pt-4 border-t border-border">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-2"
                      onClick={() => user ? handleLikePost(post.id) : toast.error("Please login to like")}
                    >
                      <Heart
                        className={post.isLiked ? 'h-4 w-4 fill-red-500 text-red-500' : 'h-4 w-4'}
                      />
                      <span>{post.likeCount}</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-2"
                      onClick={() => handleOpenComments(post)}
                    >
                      <MessageCircle className="h-4 w-4" />
                      <span>{post.commentCount}</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-2"
                      onClick={() => handleShare(post.id)}
                    >
                      <Share2 className="h-4 w-4" />
                      <span>Share</span>
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </Layout>

      {/* Comments Dialog */}
      <Dialog open={!!selectedPost} onOpenChange={() => setSelectedPost(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Comments</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4 py-4">
            {loadingComments ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : comments.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No comments yet. Be the first to comment!
              </p>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className="flex gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={comment.author.avatar || undefined} />
                    <AvatarFallback>{comment.author.name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="bg-muted rounded-lg p-3">
                      <p className="font-semibold text-sm">{comment.author.name}</p>
                      <p className="text-sm">{comment.content}</p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Add Comment */}
          {user ? (
            <div className="flex gap-2 pt-4 border-t">
              <Textarea
                placeholder="Write a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="min-h-[60px] resize-none"
              />
              <Button
                onClick={handleAddComment}
                disabled={!newComment.trim() || submittingComment}
                size="icon"
              >
                {submittingComment ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          ) : (
            <p className="text-center text-sm text-muted-foreground py-4 border-t">
              <Link to="/login" className="text-primary hover:underline">Login</Link> to comment
            </p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Community;