#!/bin/bash

# Check and install dependencies
check_and_install_dependencies() {
    # Check for audiowaveform
    if ! command -v audiowaveform &> /dev/null; then
        echo "audiowaveform is not installed. Please install it first:"
        echo "  macOS: brew install audiowaveform"
        echo "  Ubuntu/Debian: sudo apt-get install audiowaveform"
        echo "  Or build from source: https://github.com/bbc/audiowaveform"
        exit 1
    fi
}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$SCRIPT_DIR/.."
# Directory containing audio files
AUDIO_DIR="$REPO_ROOT/public/audio"

# Function to process a single MP3 file
process_mp3_file() {
    local mp3_file="$1"
    local dir_path="$(dirname "$mp3_file")"
    local filename="$(basename "$mp3_file")"
    local basename="${filename%.*}"
    local output_file="$dir_path/${basename}-waveform.json"
    
    # Skip if waveform already exists
    if [[ -f "$output_file" ]]; then
        echo "Waveform already exists for $filename, skipping..."
        return
    fi
    
    echo "Processing $filename..."
    
    audiowaveform -i "$mp3_file" \
        -o "$output_file" \
        --pixels-per-second 5 \
        --bits 8 \
        --output-format json
        
    if [[ $? -eq 0 ]]; then
        echo "✓ Created waveform: $output_file"
    else
        echo "✗ Failed to process: $filename"
    fi
}

# Function to find and process all MP3 files
process_all_mp3_files() {
    echo "Scanning for MP3 files in $AUDIO_DIR..."
    
    # Find all MP3 files recursively
    while IFS= read -r -d '' mp3_file; do
        process_mp3_file "$mp3_file"
    done < <(find "$AUDIO_DIR" -type f -name "*.mp3" -print0)
}

# Function to process MP3 files in a specific directory
process_directory() {
    local dir_path="$1"
    
    if [[ ! -d "$dir_path" ]]; then
        echo "Directory not found: $dir_path"
        return 1
    fi
    
    echo "Processing MP3 files in $dir_path..."
    
    while IFS= read -r -d '' mp3_file; do
        process_mp3_file "$mp3_file"
    done < <(find "$dir_path" -type f -name "*.mp3" -print0)
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -a, --all              Process all MP3 files in the audio directory"
    echo "  -d, --dir DIRECTORY    Process MP3 files in a specific subdirectory"
    echo "  -h, --help             Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 --all                                    # Process all MP3 files"
    echo "  $0 --dir italy                              # Process only italy directory"
    echo "  $0 --dir palo-alto                          # Process only palo-alto directory"
    echo ""
    echo "Available directories:"
    for dir in "$AUDIO_DIR"/*/; do
        if [[ -d "$dir" ]]; then
            local dirname=$(basename "$dir")
            local mp3_count=$(find "$dir" -name "*.mp3" | wc -l)
            echo "  - $dirname ($mp3_count MP3 files)"
        fi
    done
}

# Main script
main() {
    echo "Audio Waveform Processor"
    echo "========================"
    
    # Check dependencies
    check_and_install_dependencies
    
    # Parse command line arguments
    if [[ $# -eq 0 ]]; then
        show_usage
        exit 0
    fi
    
    case "$1" in
        -a|--all)
            process_all_mp3_files
            ;;
        -d|--dir)
            if [[ -z "$2" ]]; then
                echo "Error: Directory name required"
                show_usage
                exit 1
            fi
            process_directory "$AUDIO_DIR/$2"
            ;;
        -h|--help)
            show_usage
            ;;
        *)
            echo "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
    
    echo ""
    echo "Audio waveform processing complete!"
}

# Run main function with all arguments
main "$@" 