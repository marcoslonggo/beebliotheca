import { useEffect, useMemo, useState } from "react";
import { Plus, Search, Edit, Trash2, BookPlus, Link as LinkIcon } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTheme } from "../../contexts/ThemeContext";
import { useAuth } from "../../contexts/AuthContext";
import { useLibrary } from "../../contexts/LibraryContext";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Badge } from "../../components/ui/Badge";
import { Spinner } from "../../components/ui/Spinner";
import {
  fetchLists,
  getList,
  deleteList,
  removeListItem,
  ReadingListSummary,
  ReadingListDetail,
} from "../../api/lists";
import ListFormDialog from "./ListFormDialog";
import AddBooksDialog from "./AddBooksDialog";
import ListItemsView from "./ListItemsView";
import AddExternalItemDialog from "./AddExternalItemDialog";
import { ListRole } from "../../types/list";

const ListsPage = () => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { currentLibrary } = useLibrary();
  const darkMode = theme === "dark";
  const queryClient = useQueryClient();

  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [isAddBooksOpen, setIsAddBooksOpen] = useState(false);
  const [isAddExternalOpen, setIsAddExternalOpen] = useState(false);
  const [editingList, setEditingList] = useState<ReadingListSummary | null>(null);

  // Fetch all lists
  const {
    data: lists = [],
    isLoading: isLoadingLists,
    error: listsError,
  } = useQuery({
    queryKey: ["readingLists"],
    queryFn: fetchLists,
  });

  // Fetch selected list details
  const {
    data: listDetail,
    isLoading: isLoadingDetail,
  } = useQuery({
    queryKey: ["readingList", selectedListId],
    queryFn: () => getList(selectedListId!),
    enabled: !!selectedListId,
  });

  // Delete list mutation
  const deleteMutation = useMutation({
    mutationFn: (listId: string) => deleteList(listId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["readingLists"] });
      setSelectedListId(null);
    },
  });

  // Remove item mutation
  const removeItemMutation = useMutation({
    mutationFn: ({ listId, itemId }: { listId: string; itemId: string }) =>
      removeListItem(listId, itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["readingList", selectedListId] });
      queryClient.invalidateQueries({ queryKey: ["readingLists"] });
    },
  });

  // Auto-select first list when data loads
  useEffect(() => {
    if (lists.length > 0 && !selectedListId) {
      setSelectedListId(lists[0].id);
    }
  }, [lists, selectedListId]);

  // Filter lists by search
  const filteredLists = lists.filter((list) =>
    list.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get selected list summary
  const selectedList = lists.find((l) => l.id === selectedListId);

  const canManageSelectedList = useMemo(() => {
    if (!selectedList || !user) return false;
    if (selectedList.owner_id === user.id) return true;
    return selectedList.role === ListRole.OWNER || selectedList.role === ListRole.COLLABORATOR;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedList, user?.id]);

  const handleCreateList = () => {
    setEditingList(null);
    setIsFormDialogOpen(true);
  };

  const handleEditList = () => {
    if (selectedList) {
      setEditingList(selectedList);
      setIsFormDialogOpen(true);
    }
  };

  const handleDeleteList = async () => {
    if (!selectedList) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete "${selectedList.title}"? All items in this list will be removed.`
    );

    if (confirmed) {
      await deleteMutation.mutateAsync(selectedList.id);
    }
  };

  const handleFormClose = () => {
    setIsFormDialogOpen(false);
    setEditingList(null);
  };

  const handleFormSuccess = (list: ReadingListSummary) => {
    queryClient.invalidateQueries({ queryKey: ["readingLists"] });
    setSelectedListId(list.id);
    handleFormClose();
  };

  const handleAddBooks = () => {
    setIsAddBooksOpen(true);
  };

  const handleAddBooksClose = () => {
    setIsAddBooksOpen(false);
  };

  const handleAddBooksSuccess = () => {
    if (selectedListId) {
      queryClient.invalidateQueries({ queryKey: ["readingList", selectedListId] });
    }
    queryClient.invalidateQueries({ queryKey: ["readingLists"] });
    handleAddBooksClose();
  };

  const handleAddExternal = () => setIsAddExternalOpen(true);
  const handleAddExternalClose = () => setIsAddExternalOpen(false);
  const handleAddExternalSuccess = () => {
    if (selectedListId) {
      queryClient.invalidateQueries({ queryKey: ["readingList", selectedListId] });
    }
    queryClient.invalidateQueries({ queryKey: ["readingLists"] });
    handleAddExternalClose();
  };

  const handleRemoveItem = async (itemId: string) => {
    if (!selectedListId) return;

    const confirmed = window.confirm("Remove this item from the list?");
    if (confirmed) {
      await removeItemMutation.mutateAsync({ listId: selectedListId, itemId });
    }
  };

  const getVisibilityBadge = (visibility: string) => {
    const colors = {
      private: darkMode
        ? "bg-gray-700/30 text-gray-400 border-gray-600/50"
        : "bg-gray-200/50 text-gray-600 border-gray-300/50",
      shared: darkMode
        ? "bg-[#8CE2D0]/20 text-[#8CE2D0] border-[#8CE2D0]/40"
        : "bg-[#8CE2D0]/20 text-[#6ab3a3] border-[#8CE2D0]/40",
      public: darkMode
        ? "bg-[#C47978]/20 text-[#C47978] border-[#C47978]/40"
        : "bg-[#C47978]/20 text-[#a86160] border-[#C47978]/40",
    };

    return (
      <Badge className={colors[visibility as keyof typeof colors] || colors.private}>
        {visibility.charAt(0).toUpperCase() + visibility.slice(1)}
      </Badge>
    );
  };

  if (isLoadingLists) {
    return (
      <div className={`flex-1 min-h-screen flex items-center justify-center ${
        darkMode ? "bg-[#0f0f0f]" : "bg-gray-50"
      }`}>
        <Spinner className={darkMode ? "text-[#8CE2D0]" : "text-gray-600"} />
      </div>
    );
  }

  if (listsError) {
    return (
      <div className={`flex-1 min-h-screen flex items-center justify-center ${
        darkMode ? "bg-[#0f0f0f]" : "bg-gray-50"
      }`}>
        <p className="text-red-400">
          Error loading lists: {listsError instanceof Error ? listsError.message : "Unknown error"}
        </p>
      </div>
    );
  }

  return (
    <div className={`flex-1 min-h-screen ${darkMode ? "bg-[#0f0f0f]" : "bg-gray-50"}`}>
      {/* Header */}
      <div className={`border-b px-6 py-4 ${
        darkMode ? "border-[#2a2a2a]" : "border-gray-200"
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg viewBox="0 0 100 100" className="w-6 h-6">
              <polygon
                points="50,5 90,30 90,70 50,95 10,70 10,30"
                fill="currentColor"
                className="text-[#8CE2D0]"
              />
            </svg>
            <h1 className={`text-2xl font-semibold ${darkMode ? "text-white" : "text-gray-900"}`}>
              Reading Lists
            </h1>
          </div>
          <Button
            onClick={handleCreateList}
            className="bg-[#8CE2D0] text-black hover:bg-[#7dd1bf]"
          >
            <Plus className="w-4 h-4 mr-2" />
            New List
          </Button>
        </div>
      </div>

      {lists.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4">
              <svg viewBox="0 0 100 100" className="w-full h-full">
                <polygon
                  points="50,5 90,30 90,70 50,95 10,70 10,30"
                  fill="currentColor"
                  className={darkMode ? "text-gray-600" : "text-gray-400"}
                />
              </svg>
            </div>
            <h2 className={`text-xl font-medium mb-2 ${darkMode ? "text-white" : "text-gray-900"}`}>
              No reading lists yet
            </h2>
            <p className={`mb-4 ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
              Create your first reading list to organize your books
            </p>
            <Button
              onClick={handleCreateList}
              className="bg-[#8CE2D0] text-black hover:bg-[#7dd1bf]"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Reading List
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-[320px_1fr] h-[calc(100vh-80px)]">
          {/* Lists Sidebar */}
          <div className={`border-r p-4 space-y-3 overflow-y-auto ${
            darkMode ? "bg-[#0a0a0a] border-[#2a2a2a]" : "bg-white border-gray-200"
          }`}>
            {/* Search */}
            <div className="relative">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${
                darkMode ? "text-gray-500" : "text-gray-400"
              }`} />
              <Input
                placeholder="Search lists..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`pl-10 ${
                  darkMode
                    ? "bg-[#1a1a1a] border-[#2a2a2a] text-white placeholder:text-gray-500"
                    : "bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400"
                }`}
              />
            </div>

            {/* Lists */}
            <div className="space-y-2">
              {filteredLists.length === 0 ? (
                <p className={`text-sm text-center py-8 ${
                  darkMode ? "text-gray-400" : "text-gray-600"
                }`}>
                  {searchQuery ? "No lists found" : "No lists yet"}
                </p>
              ) : (
                filteredLists.map((list) => (
                  <div
                    key={list.id}
                    onClick={() => setSelectedListId(list.id)}
                    className={`p-3 rounded-lg cursor-pointer transition-all relative overflow-hidden ${
                      selectedListId === list.id
                        ? darkMode
                          ? "bg-[#1a2a2a] border-l-2 border-[#8CE2D0]"
                          : "bg-[#8CE2D0]/10 border-l-2 border-[#8CE2D0]"
                        : darkMode
                          ? "bg-[#1a1a1a] hover:bg-[#1a2020]"
                          : "bg-gray-50 hover:bg-gray-100"
                    }`}
                  >
                    <div className="absolute top-0 right-0 w-12 h-12 opacity-5">
                      <svg viewBox="0 0 50 50" className="w-full h-full">
                        <polygon
                          points="25,2 45,15 45,35 25,48 5,35 5,15"
                          fill="currentColor"
                          className="text-[#C47978]"
                        />
                      </svg>
                    </div>
                    <div className="flex items-start justify-between mb-1 relative z-10">
                      <p className={`text-sm font-medium flex-1 ${
                        darkMode ? "text-white" : "text-gray-900"
                      }`}>
                        {list.title}
                      </p>
                      {getVisibilityBadge(list.visibility)}
                    </div>
                    <p className={`text-xs relative z-10 ${
                      darkMode ? "text-gray-400" : "text-gray-600"
                    }`}>
                      {list.item_count} {list.item_count === 1 ? "item" : "items"}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* List Detail */}
          <div className="p-6 overflow-y-auto">
            {isLoadingDetail ? (
              <div className="flex items-center justify-center py-20">
                <Spinner className={darkMode ? "text-[#8CE2D0]" : "text-gray-600"} />
              </div>
            ) : listDetail && selectedList ? (
              <div className="max-w-6xl mx-auto">
                {/* List Header */}
                <div className={`rounded-lg p-6 border mb-6 relative overflow-hidden ${
                  darkMode
                    ? "bg-[#1a1a1a] border-[#2a2a2a]"
                    : "bg-white border-gray-200"
                }`}>
                  <div className="absolute top-0 right-0 w-32 h-32 opacity-5">
                    <svg viewBox="0 0 100 100" className="w-full h-full">
                      <polygon
                        points="50,5 90,30 90,70 50,95 10,70 10,30"
                        fill="currentColor"
                        className="text-[#8CE2D0]"
                      />
                    </svg>
                  </div>

                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h2 className={`text-2xl font-semibold ${
                          darkMode ? "text-white" : "text-gray-900"
                        }`}>
                          {listDetail.list.title}
                        </h2>
                        {getVisibilityBadge(listDetail.list.visibility)}
                      </div>
                      {listDetail.list.description && (
                        <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                          {listDetail.list.description}
                        </p>
                      )}
                    </div>
                    {!!selectedList && canManageSelectedList && (
                      <div className="flex flex-col gap-2 ml-4">
                        <div className="flex items-center gap-2">
                          <Button
                            onClick={handleAddBooks}
                            className="bg-[#8CE2D0] text-black hover:bg-[#7dd1bf]"
                            disabled={!currentLibrary}
                          >
                            <BookPlus className="w-4 h-4 mr-2" />
                            Add Library Books
                          </Button>
                          <Button
                            onClick={handleAddExternal}
                            variant="outline"
                            className={
                              darkMode
                                ? "border-[#2a2a2a] text-gray-200 hover:text-white hover:border-[#8CE2D0]"
                                : "border-gray-200 text-gray-700 hover:border-[#8CE2D0]"
                            }
                          >
                            <LinkIcon className="w-4 h-4 mr-2" />
                            Add Custom Entry
                          </Button>
                        </div>
                        {!currentLibrary && (
                          <p className={`text-xs ${darkMode ? "text-gray-500" : "text-gray-600"}`}>
                            Select a library to pull books into this list.
                          </p>
                        )}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={handleEditList}
                            className={`transition-colors ${
                              darkMode
                                ? "text-gray-400 hover:text-white"
                                : "text-gray-600 hover:text-gray-900"
                            }`}
                          >
                            <Edit className="w-5 h-5" />
                          </button>
                          <button
                            onClick={handleDeleteList}
                            className="text-gray-400 hover:text-[#C47978] transition-colors"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* List Items */}
                <ListItemsView
                  items={listDetail.items}
                  progress={listDetail.progress}
                  onRemoveItem={handleRemoveItem}
                  canEdit={canManageSelectedList}
                />
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className={darkMode ? "text-gray-400" : "text-gray-600"}>
                  {filteredLists.length === 0
                    ? "Create a list to get started"
                    : "Select a list to view details"}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Dialogs */}
      <ListFormDialog
        isOpen={isFormDialogOpen}
        onClose={handleFormClose}
        list={editingList}
        onSuccess={handleFormSuccess}
      />

      {selectedListId && (
        <AddBooksDialog
          isOpen={isAddBooksOpen}
          onClose={handleAddBooksClose}
          listId={selectedListId}
          onSuccess={handleAddBooksSuccess}
        />
      )}

      {selectedListId && (
        <AddExternalItemDialog
          isOpen={isAddExternalOpen}
          onClose={handleAddExternalClose}
          listId={selectedListId}
          onSuccess={handleAddExternalSuccess}
        />
      )}
    </div>
  );
};

export default ListsPage;
