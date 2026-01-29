import { Trash2, BookOpen, ExternalLink } from "lucide-react";
import { useTheme } from "../../contexts/ThemeContext";
import { ReadingListItem, ReadingListProgress } from "../../types/list";
import { Badge } from "../../components/ui/Badge";

interface ListItemsViewProps {
  items: ReadingListItem[];
  progress: ReadingListProgress[];
  onRemoveItem: (itemId: string) => void;
  canEdit: boolean;
}

const ListItemsView = ({ items, progress, onRemoveItem, canEdit }: ListItemsViewProps) => {
  const { theme } = useTheme();
  const darkMode = theme === "dark";

  const getProgressForItem = (itemId: string) => {
    return progress.find((p) => p.list_item_id === itemId);
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      not_started: darkMode
        ? "bg-gray-700/30 text-gray-400 border-gray-600/50"
        : "bg-gray-200/50 text-gray-600 border-gray-300/50",
      in_progress: darkMode
        ? "bg-[#8CE2D0]/20 text-[#8CE2D0] border-[#8CE2D0]/40"
        : "bg-[#8CE2D0]/20 text-[#6ab3a3] border-[#8CE2D0]/40",
      completed: darkMode
        ? "bg-green-900/30 text-green-400 border-green-700/50"
        : "bg-green-600/20 text-green-700 border-green-600/40",
    };

    const labels = {
      not_started: "Not Started",
      in_progress: "In Progress",
      completed: "Completed",
    };

    return (
      <Badge className={colors[status as keyof typeof colors]}>
        {labels[status as keyof typeof labels]}
      </Badge>
    );
  };

  if (items.length === 0) {
    return (
      <div
        className={`rounded-lg p-12 border text-center ${
          darkMode
            ? "bg-[#1a1a1a] border-[#2a2a2a]"
            : "bg-white border-gray-200"
        }`}
      >
        <BookOpen
          className={`w-16 h-16 mx-auto mb-4 ${
            darkMode ? "text-gray-600" : "text-gray-400"
          }`}
        />
        <h3
          className={`text-lg font-medium mb-2 ${
            darkMode ? "text-white" : "text-gray-900"
          }`}
        >
          No books in this list yet
        </h3>
        <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
          {canEdit
            ? "Click the Add Books button to add books to this list"
            : "The list owner hasn't added any books yet"}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items
        .sort((a, b) => a.order_index - b.order_index)
        .map((item, index) => {
          const itemProgress = getProgressForItem(item.id);

          return (
            <div
              key={item.id}
              className={`rounded-lg p-4 border transition-all ${
                darkMode
                  ? "bg-[#1a1a1a] border-[#2a2a2a] hover:border-[#8CE2D0]/30"
                  : "bg-white border-gray-200 hover:border-[#8CE2D0]/50"
              }`}
            >
              <div className="flex items-start gap-4">
                {/* Order number */}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    darkMode
                      ? "bg-[#0a0a0a] text-gray-400"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  <span className="text-sm font-medium">{index + 1}</span>
                </div>

                {/* Book cover */}
                {item.cover_image_url && (
                  <div className="w-16 h-24 rounded overflow-hidden bg-gray-800 flex-shrink-0">
                    <img
                      src={item.cover_image_url}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                {/* Book details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="flex items-center gap-2">
                          <h3
                            className={`font-medium ${
                              darkMode ? "text-white" : "text-gray-900"
                            }`}
                          >
                            {item.title}
                          </h3>
                          {item.item_type === "external" && (
                            <Badge
                              className={
                                darkMode
                                  ? "bg-[#2a2a2a] text-gray-200 border-[#3a3a3a]"
                                  : "bg-gray-100 text-gray-700 border-gray-200"
                              }
                            >
                              Custom
                            </Badge>
                          )}
                        </div>
                        {item.item_type === "external" && (
                          <ExternalLink
                            className={`w-4 h-4 ${
                              darkMode ? "text-gray-500" : "text-gray-400"
                            }`}
                          />
                        )}
                      </div>
                      {item.author && (
                        <p
                          className={`text-sm ${
                            darkMode ? "text-gray-400" : "text-gray-600"
                          }`}
                        >
                          by {item.author}
                        </p>
                      )}
                      {item.isbn && (
                        <p
                          className={`text-xs mt-1 ${
                            darkMode ? "text-gray-500" : "text-gray-500"
                          }`}
                        >
                          ISBN: {item.isbn}
                        </p>
                      )}
                    </div>

                    {/* Status and actions */}
                    <div className="flex items-center gap-2">
                      {itemProgress && getStatusBadge(itemProgress.status)}
                      {canEdit && (
                        <button
                          onClick={() => onRemoveItem(item.id)}
                          className={`p-1 rounded transition-colors ${
                            darkMode
                              ? "text-gray-500 hover:text-[#C47978] hover:bg-[#C47978]/10"
                              : "text-gray-400 hover:text-[#C47978] hover:bg-[#C47978]/10"
                          }`}
                          title="Remove from list"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Notes */}
                  {item.notes && (
                    <p
                      className={`text-sm mt-2 p-2 rounded ${
                        darkMode ? "bg-[#0a0a0a] text-gray-300" : "bg-gray-50 text-gray-700"
                      }`}
                    >
                      {item.notes}
                    </p>
                  )}

                  {/* Progress notes */}
                  {itemProgress?.notes && (
                    <p
                      className={`text-sm mt-2 p-2 rounded border-l-2 ${
                        darkMode
                          ? "bg-[#0a0a0a] text-gray-300 border-[#8CE2D0]"
                          : "bg-[#8CE2D0]/5 text-gray-700 border-[#8CE2D0]"
                      }`}
                    >
                      <span className="font-medium">Your notes:</span> {itemProgress.notes}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
    </div>
  );
};

export default ListItemsView;
