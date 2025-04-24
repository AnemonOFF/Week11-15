import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Button,
  StyleSheet,
  TextInput,
  Image,
  TouchableOpacity,
  Modal,
  Alert,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from "react-native";
import { Camera, CameraView } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { SwipeListView } from "react-native-swipe-list-view";
import { executeSql, getSql } from "../components/database/database";
import { Picker } from "@react-native-picker/picker";
import { AntDesign } from "@expo/vector-icons";

const HomeScreen = ({ route }) => {
  // State management
  const [hasCameraPermission, setHasCameraPermission] = useState(null);
  const [camera, setCamera] = useState(null);
  const [image, setImage] = useState(null);
  const [description, setDescription] = useState("");
  const [journals, setJournals] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [category, setCategory] = useState("All");
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showStats, setShowStats] = useState(false);
  const [mealRating, setMealRating] = useState(3);
  const [isSearchVisible, setIsSearchVisible] = useState(false);

  // Categories for filtering
  const categories = ["All", "Breakfast", "Lunch", "Dinner", "Snacks"];

  // Initialize camera and load journals
  useEffect(() => {
    const initialize = async () => {
      // Request camera permissions
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasCameraPermission(status === "granted");

      // Load journal entries
      await loadJournals();
      setIsLoading(false);
    };

    initialize();
  }, []);

  // Load journals from database
  const loadJournals = async () => {
    try {
      const userId = route.params?.userId;
      if (!userId) {
        Alert.alert("Error", "User not authenticated");
        return;
      }

      const result = await getSql(
        "SELECT * FROM journals WHERE userId = ? ORDER BY date DESC",
        [userId]
      );

      setJournals(result || []);
    } catch (error) {
      console.error("Error loading journals:", error);
      Alert.alert("Error", "Failed to load journals");
    }
  };

  // Take picture with camera
  const takePicture = async () => {
    if (!camera) return;

    try {
      const { uri } = await camera.takePictureAsync({
        quality: 0.8,
      });
      setImage(uri);
      setIsCameraOpen(false);
    } catch (error) {
      console.error("Camera error:", error);
      Alert.alert("Error", "Failed to take picture");
    }
  };

  // Select image from gallery
  const pickImage = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission required",
          "Please allow access to your photos"
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled) {
        setImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Image picker error:", error);
      Alert.alert("Error", "Failed to select image");
    }
  };

  // Save or update journal entry
  const saveJournal = async () => {
    if (!image || !description.trim()) {
      Alert.alert(
        "Validation Error",
        "Please add both an image and description"
      );
      return;
    }

    try {
      const userId = route.params?.userId;
      if (!userId) {
        Alert.alert("Error", "User not authenticated");
        return;
      }

      if (editingId) {
        // Update existing entry
        await executeSql(
          "UPDATE journals SET image = ?, description = ?, category = ?, rating = ? WHERE id = ?",
          [image, description.trim(), category, mealRating, editingId]
        );
        Alert.alert("Success", "Journal updated successfully");
      } else {
        // Create new entry
        await executeSql(
          "INSERT INTO journals (userId, image, description, category, date, rating) VALUES (?, ?, ?, ?, ?, ?)",
          [
            userId,
            image,
            description.trim(),
            category,
            new Date().toISOString(),
            mealRating,
          ]
        );
        Alert.alert("Success", "Journal saved successfully");
      }

      await loadJournals();
      resetForm();
    } catch (error) {
      console.error("Save error:", error);
      Alert.alert("Error", "An unexpected error occurred");
    }
  };

  // Delete journal entry
  const deleteJournal = async (id) => {
    Alert.alert(
      "Confirm Delete",
      "Are you sure you want to delete this journal entry?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          onPress: async () => {
            try {
              await executeSql("DELETE FROM journals WHERE id = ?", [id]);
              await loadJournals();
              Alert.alert("Success", "Journal deleted successfully");
            } catch (error) {
              console.error("Delete error:", error);
              Alert.alert("Error", "Failed to delete journal");
            }
          },
          style: "destructive",
        },
      ]
    );
  };

  // Reset form fields
  const resetForm = () => {
    setImage(null);
    setDescription("");
    setEditingId(null);
    setCategory("All");
    setMealRating(3);
  };

  // Calculate category statistics
  const getStats = () => {
    const stats = categories.reduce((acc, cat) => {
      if (cat !== "All") {
        acc[cat] = journals.filter((item) => item.category === cat).length;
      }
      return acc;
    }, {});

    stats.Total = journals.length;

    // Average rating
    const totalRating = journals.reduce(
      (sum, journal) => sum + (journal.rating || 3),
      0
    );
    stats.AverageRating = journals.length
      ? (totalRating / journals.length).toFixed(1)
      : "N/A";

    return stats;
  };

  // Filter journals by category and search query
  const filteredJournals = journals.filter((item) => {
    const matchesCategory = category === "All" || item.category === category;
    const matchesSearch = searchQuery
      ? item.description.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    return matchesCategory && matchesSearch;
  });

  // Render star rating component
  const renderStarRating = (rating, interactive = true) => {
    return (
      <View style={styles.ratingContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => interactive && setMealRating(star)}
            disabled={!interactive}
          >
            <AntDesign
              name={rating >= star ? "star" : "staro"}
              size={interactive ? 24 : 16}
              color="#fbbc05"
              style={styles.starIcon}
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  // Loading state
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text>Loading your food journals...</Text>
      </View>
    );
  }

  // Camera permission denied
  if (hasCameraPermission === false) {
    return (
      <View style={styles.permissionContainer}>
        <Text>Camera permission is required to take photos</Text>
        <Button
          title="Grant Permission"
          onPress={() => Camera.requestCameraPermissionsAsync()}
        />
      </View>
    );
  }

  // Stats component
  const StatsComponent = () => {
    const stats = getStats();

    return (
      <View style={styles.statsContainer}>
        <View style={styles.statsHeader}>
          <Text style={styles.statsTitle}>Your Food Journal Stats</Text>
          <TouchableOpacity onPress={() => setShowStats(false)}>
            <AntDesign name="close" size={24} color="#333" />
          </TouchableOpacity>
        </View>

        <View style={styles.statsGrid}>
          {Object.entries(stats).map(([key, value]) => (
            <View key={key} style={styles.statItem}>
              <Text style={styles.statValue}>{value}</Text>
              <Text style={styles.statLabel}>{key}</Text>
            </View>
          ))}
        </View>

        <View style={styles.statsCategoryChart}>
          {categories.slice(1).map((cat) => {
            const count = stats[cat] || 0;
            const percentage = journals.length
              ? (count / journals.length) * 100
              : 0;

            return (
              <View key={cat} style={styles.chartRow}>
                <Text style={styles.chartLabel}>{cat}</Text>
                <View style={styles.chartBarContainer}>
                  <View
                    style={[
                      styles.chartBar,
                      {
                        width: `${percentage}%`,
                        backgroundColor: getCategoryColor(cat),
                      },
                    ]}
                  />
                </View>
                <Text style={styles.chartValue}>{count}</Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  // Get color for category
  const getCategoryColor = (category) => {
    const colors = {
      Breakfast: "#4285f4",
      Lunch: "#34a853",
      Dinner: "#ea4335",
      Snacks: "#fbbc05",
    };

    return colors[category] || "#4285f4";
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView>
        {/* Stats Modal */}
        {showStats && <StatsComponent />}

        {/* Camera Modal */}
        <Modal visible={isCameraOpen} animationType="slide">
          <View style={styles.cameraContainer}>
            <CameraView
              style={styles.camera}
              ref={(ref) => setCamera(ref)}
              ratio="16:9"
            />
            <View style={styles.cameraButtons}>
              <TouchableOpacity
                style={styles.captureButton}
                onPress={takePicture}
              >
                <View style={styles.captureButtonInner} />
              </TouchableOpacity>
              <Button
                title="Close"
                onPress={() => setIsCameraOpen(false)}
                color="#ff4444"
              />
            </View>
          </View>
        </Modal>

        {/* Header with Stats button */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Food Journal</Text>
          <TouchableOpacity
            style={styles.statsButton}
            onPress={() => setShowStats(true)}
          >
            <AntDesign name="barschart" size={24} color="white" />
          </TouchableOpacity>
        </View>

        {/* Journal Input Section */}
        <View style={styles.inputContainer}>
          <Text style={styles.sectionTitle}>
            {editingId ? "Edit Journal Entry" : "Add New Journal Entry"}
          </Text>

          {/* Image Preview */}
          {image ? (
            <Image source={{ uri: image }} style={styles.previewImage} />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Text>No image selected</Text>
            </View>
          )}

          {/* Image Selection Buttons */}
          <View style={styles.buttonGroup}>
            <TouchableOpacity
              style={styles.imageButton}
              onPress={() => setIsCameraOpen(true)}
            >
              <Text style={styles.buttonText}>Take Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.imageButton} onPress={pickImage}>
              <Text style={styles.buttonText}>Choose from Gallery</Text>
            </TouchableOpacity>
          </View>

          {/* Description Input */}
          <TextInput
            placeholder="What did you eat? Add details..."
            value={description}
            onChangeText={setDescription}
            style={styles.input}
            multiline
            numberOfLines={3}
          />

          {/* Meal Rating */}
          <View style={styles.ratingSection}>
            <Text style={styles.ratingLabel}>How was this meal?</Text>
            {renderStarRating(mealRating)}
          </View>

          {/* Category Picker */}
          <View style={styles.pickerContainer}>
            <Text style={styles.pickerLabel}>Category:</Text>
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={category}
                onValueChange={(itemValue) => setCategory(itemValue)}
                style={styles.picker}
              >
                {categories.map((cat) => (
                  <Picker.Item key={cat} label={cat} value={cat} />
                ))}
              </Picker>
            </View>
          </View>

          {/* Save/Update Button */}
          <TouchableOpacity style={styles.saveButton} onPress={saveJournal}>
            <Text style={styles.saveButtonText}>
              {editingId ? "Update Journal" : "Save Journal"}
            </Text>
          </TouchableOpacity>

          {/* Cancel Edit Button (visible only when editing) */}
          {editingId && (
            <TouchableOpacity style={styles.cancelButton} onPress={resetForm}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Journal List Section */}
        <View style={styles.listContainer}>
          <View style={styles.listHeader}>
            <Text style={styles.sectionTitle}>Your Food Journals</Text>

            <TouchableOpacity
              style={styles.searchButton}
              onPress={() => setIsSearchVisible(!isSearchVisible)}
            >
              <AntDesign name="search1" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          {isSearchVisible && (
            <View style={styles.searchContainer}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search journals..."
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery ? (
                <TouchableOpacity
                  style={styles.clearSearch}
                  onPress={() => setSearchQuery("")}
                >
                  <AntDesign name="close" size={20} color="#999" />
                </TouchableOpacity>
              ) : null}
            </View>
          )}

          {/* Category Filter */}
          <View style={styles.filterContainer}>
            <Text style={styles.filterLabel}>Filter by:</Text>
            <View style={styles.filterPickerWrapper}>
              <Picker
                selectedValue={category}
                onValueChange={(itemValue) => setCategory(itemValue)}
                style={styles.filterPicker}
              >
                {categories.map((cat) => (
                  <Picker.Item key={cat} label={cat} value={cat} />
                ))}
              </Picker>
            </View>
          </View>

          {/* Journal List */}
          {filteredJournals.length > 0 ? (
            <SwipeListView
              scrollEnabled={false}
              data={filteredJournals}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <View style={styles.journalItem}>
                  <Image
                    source={{ uri: item.image }}
                    style={styles.journalImage}
                  />
                  <View style={styles.journalDetails}>
                    <Text style={styles.journalDescription}>
                      {item.description}
                    </Text>
                    <View style={styles.journalMeta}>
                      <Text
                        style={[
                          styles.journalCategory,
                          { color: getCategoryColor(item.category) },
                        ]}
                      >
                        {item.category}
                      </Text>
                      <Text style={styles.journalDate}>
                        {new Date(item.date).toLocaleDateString()}
                      </Text>
                    </View>
                    {renderStarRating(item.rating || 3, false)}
                  </View>
                </View>
              )}
              renderHiddenItem={({ item }) => (
                <View style={styles.hiddenButtons}>
                  <TouchableOpacity
                    style={[styles.hiddenButton, styles.editButton]}
                    onPress={() => {
                      setEditingId(item.id);
                      setDescription(item.description);
                      setImage(item.image);
                      setCategory(item.category);
                      setMealRating(item.rating || 3);
                    }}
                  >
                    <Text style={styles.hiddenButtonText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.hiddenButton, styles.deleteButton]}
                    onPress={() => deleteJournal(item.id)}
                  >
                    <Text style={styles.hiddenButtonText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              )}
              rightOpenValue={-150}
              disableRightSwipe
              showsVerticalScrollIndicator={false}
            />
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                {searchQuery
                  ? `No results for "${searchQuery}"`
                  : category === "All"
                  ? "No journal entries yet. Add your first entry above!"
                  : `No entries in ${category} category`}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

// Styles for the application
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#4285f4",
    padding: 15,
    paddingTop: Platform.OS === "ios" ? 50 : 15,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "white",
  },
  statsButton: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  permissionContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: "black",
  },
  camera: {
    flex: 1,
  },
  cameraButtons: {
    position: "absolute",
    bottom: 30,
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    borderWidth: 3,
    borderColor: "white",
    justifyContent: "center",
    alignItems: "center",
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "white",
  },
  inputContainer: {
    backgroundColor: "white",
    padding: 20,
    margin: 15,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
    color: "#333",
  },
  previewImage: {
    width: "100%",
    height: 200,
    borderRadius: 8,
    marginBottom: 15,
  },
  imagePlaceholder: {
    width: "100%",
    height: 200,
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
  },
  buttonGroup: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  imageButton: {
    backgroundColor: "#4285f4",
    padding: 10,
    borderRadius: 5,
    width: "48%",
    alignItems: "center",
  },
  buttonText: {
    color: "white",
    fontWeight: "bold",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 5,
    padding: 12,
    marginBottom: 15,
    fontSize: 16,
    textAlignVertical: "top",
  },
  ratingSection: {
    marginBottom: 15,
  },
  ratingLabel: {
    fontSize: 16,
    marginBottom: 5,
  },
  ratingContainer: {
    flexDirection: "row",
  },
  starIcon: {
    marginRight: 5,
  },
  pickerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  pickerLabel: {
    marginRight: 10,
    fontSize: 16,
  },
  pickerWrapper: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 5,
  },
  picker: {
    // height: 50,
  },
  saveButton: {
    backgroundColor: "#34a853",
    padding: 15,
    borderRadius: 5,
    alignItems: "center",
    marginBottom: 10,
  },
  saveButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
  cancelButton: {
    backgroundColor: "#ea4335",
    padding: 15,
    borderRadius: 5,
    alignItems: "center",
  },
  cancelButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
  listContainer: {
    flex: 1,
    backgroundColor: "white",
    padding: 15,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 5,
  },
  listHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  searchButton: {
    padding: 5,
  },
  searchContainer: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 5,
    padding: 10,
    marginBottom: 15,
    alignItems: "center",
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  clearSearch: {
    padding: 5,
  },
  filterContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  filterLabel: {
    marginRight: 10,
    fontSize: 16,
  },
  filterPickerWrapper: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 5,
  },
  filterPicker: {
    // height: 40,
  },
  journalItem: {
    backgroundColor: "white",
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    flexDirection: "row",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  journalImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  journalDetails: {
    flex: 1,
    marginLeft: 15,
    justifyContent: "center",
  },
  journalDescription: {
    fontSize: 16,
    marginBottom: 5,
  },
  journalMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  journalCategory: {
    color: "#4285f4",
    fontWeight: "bold",
  },
  journalDate: {
    color: "#666",
  },
  hiddenButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    height: "100%",
    padding: 10,
    // marginBottom: 10,
  },
  hiddenButton: {
    justifyContent: "center",
    alignItems: "center",
    width: 75,
    height: "100%",
  },
  editButton: {
    backgroundColor: "#fbbc05",
  },
  deleteButton: {
    backgroundColor: "#ea4335",
  },
  hiddenButtonText: {
    color: "white",
    fontWeight: "bold",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyStateText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
  statsContainer: {
    backgroundColor: "white",
    margin: 15,
    padding: 20,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  statsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  statItem: {
    width: "48%",
    backgroundColor: "#f2f2f2",
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: "center",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#4285f4",
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 14,
    color: "#666",
  },
  statsCategoryChart: {
    marginTop: 10,
  },
  chartRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  chartLabel: {
    width: 80,
    fontSize: 14,
  },
  chartBarContainer: {
    flex: 1,
    height: 15,
    backgroundColor: "#f2f2f2",
    borderRadius: 10,
    marginHorizontal: 10,
  },
  chartBar: {
    height: "100%",
    borderRadius: 10,
  },
  chartValue: {
    width: 30,
    fontSize: 14,
    textAlign: "right",
  },
});

export default HomeScreen;
