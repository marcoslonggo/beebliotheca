import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTheme } from "../../contexts/ThemeContext";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Textarea } from "../../components/ui/Textarea";
import { createComment, BookClubComment } from "../../api/bookClubs";

interface DiscussionSectionProps {
  clubId: string;
  comments: BookClubComment[];
}

const DiscussionSection = ({ clubId, comments }: DiscussionSectionProps) => {
  const { theme } = useTheme();
  const darkMode = theme === "dark";
  const queryClient = useQueryClient();

  const [pageNumber, setPageNumber] = useState("");
  const [commentBody, setCommentBody] = useState("");

  const createCommentMutation = useMutation({
    mutationFn: () =>
      createComment(clubId, {
        page_number: parseInt(pageNumber) || 0,
        body: commentBody,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookClub", clubId] });
      setPageNumber("");
      setCommentBody("");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pageNumber && commentBody.trim()) {
      createCommentMutation.mutate();
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const sortedComments = [...comments].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return (
    <div
      className={`rounded-lg p-6 border ${
        darkMode
          ? "bg-[#1a1a1a] border-[#2a2a2a]"
          : "bg-white border-gray-200"
      }`}
    >
      <h3
        className={`mb-2 font-semibold ${
          darkMode ? "text-white" : "text-gray-900"
        }`}
      >
        Discussion
      </h3>
      <p
        className={`text-sm mb-4 ${
          darkMode ? "text-gray-400" : "text-gray-600"
        }`}
      >
        Comments visible to all members
      </p>

      <form onSubmit={handleSubmit} className="space-y-4 mb-6">
        <div>
          <label
            className={`text-sm mb-2 block ${
              darkMode ? "text-gray-400" : "text-gray-600"
            }`}
          >
            Comment page
          </label>
          <Input
            type="number"
            min="0"
            value={pageNumber}
            onChange={(e) => setPageNumber(e.target.value)}
            placeholder="Page number"
            className={
              darkMode
                ? "bg-[#0a0a0a] border-[#2a2a2a] text-white"
                : "bg-gray-50 border-gray-200 text-gray-900"
            }
          />
        </div>

        <div>
          <label
            className={`text-sm mb-2 block ${
              darkMode ? "text-gray-400" : "text-gray-600"
            }`}
          >
            Share your thoughts
          </label>
          <Textarea
            value={commentBody}
            onChange={(e) => setCommentBody(e.target.value)}
            placeholder="Write your comment..."
            className={`min-h-[100px] ${
              darkMode
                ? "bg-[#0a0a0a] border-[#2a2a2a] text-white"
                : "bg-gray-50 border-gray-200 text-gray-900"
            }`}
          />
        </div>

        <Button
          type="submit"
          className="w-full bg-[#8CE2D0] text-black hover:bg-[#7dd1bf]"
          disabled={
            !pageNumber ||
            !commentBody.trim() ||
            createCommentMutation.isPending
          }
        >
          {createCommentMutation.isPending ? "Posting..." : "Post Comment"}
        </Button>

        {createCommentMutation.error && (
          <p className="text-red-400 text-sm">
            {createCommentMutation.error instanceof Error
              ? createCommentMutation.error.message
              : "Failed to post comment"}
          </p>
        )}
      </form>

      <div
        className={`pt-6 border-t ${
          darkMode ? "border-[#2a2a2a]" : "border-gray-200"
        }`}
      >
        {sortedComments.length === 0 ? (
          <p
            className={`text-sm ${
              darkMode ? "text-gray-400" : "text-gray-600"
            }`}
          >
            No comments yet. Be the first to share your thoughts!
          </p>
        ) : (
          <div className="space-y-4">
            {sortedComments.map((comment) => (
              <div
                key={comment.id}
                className={`p-4 rounded-lg ${
                  darkMode ? "bg-[#0a0a0a]" : "bg-gray-50"
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <p
                      className={`text-sm font-medium ${
                        darkMode ? "text-white" : "text-gray-900"
                      }`}
                    >
                      {comment.user_id}
                    </p>
                    <span
                      className={`text-xs px-2 py-0.5 rounded ${
                        darkMode
                          ? "bg-[#8CE2D0]/20 text-[#8CE2D0]"
                          : "bg-[#8CE2D0]/20 text-[#6ab3a3]"
                      }`}
                    >
                      Page {comment.page_number}
                    </span>
                  </div>
                  <p
                    className={`text-xs ${
                      darkMode ? "text-gray-500" : "text-gray-400"
                    }`}
                  >
                    {formatDate(comment.created_at)}
                  </p>
                </div>
                <p
                  className={`text-sm whitespace-pre-wrap ${
                    darkMode ? "text-gray-300" : "text-gray-700"
                  }`}
                >
                  {comment.body}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DiscussionSection;
