#!/bin/bash

# ANSI color codes for styling
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

# Function to display banner
show_banner() {
    echo
    # Colors from the SVG
    M1='\033[1;31m'  # Red
    E1='\033[1;38;5;208m'  # Orange
    M2='\033[1;33m'  # Yellow
    ZERO='\033[1;32m'  # Green
    M3='\033[1;34m'  # Blue
    C='\033[1;35m'  # Purple
    P='\033[1;38;5;213m'  # Pink
    
    # MEM0-MCP logo extracted from SVG
    echo -e "${M1}███╗   ███╗${E1}███████╗${M2}███╗   ███╗${ZERO} ██████╗ ${M3}███╗   ███╗${C} ██████╗${P}██████╗ ${RESET}"
    echo -e "${M1}████╗ ████║${E1}██╔════╝${M2}████╗ ████║${ZERO}██╔═══██╗${M3}████╗ ████║${C}██╔════╝${P}██╔══██╗${RESET}"
    echo -e "${M1}██╔████╔██║${E1}█████╗  ${M2}██╔████╔██║${ZERO}██║   ██║${M3}██╔████╔██║${C}██║     ${P}██████╔╝${RESET}"
    echo -e "${M1}██║╚██╔╝██║${E1}██╔══╝  ${M2}██║╚██╔╝██║${ZERO}██║   ██║${M3}██║╚██╔╝██║${C}██║     ${P}██╔═══╝ ${RESET}"
    echo -e "${M1}██║ ╚═╝ ██║${E1}███████╗${M2}██║ ╚═╝ ██║${ZERO}╚██████╔╝${M3}██║ ╚═╝ ██║${C}╚██████╗${P}██║     ${RESET}"
    echo -e "${M1}╚═╝     ╚═╝${E1}╚══════╝${M2}╚═╝     ╚═╝${ZERO} ╚═════╝ ${M3}╚═╝     ╚═╝${C} ╚═════╝${P}╚═╝     ${RESET}"
    
    echo -e "\n${YELLOW}${BOLD}✨ Persistent Memory for LLMs ✨${RESET}\n"
}

# Function to view README.md
view_readme() {
    if [ -f "README.md" ]; then
        if command -v less &> /dev/null; then
            less README.md
        else
            cat README.md
        fi
    else
        echo -e "${RED}README.md not found in the current directory.${RESET}"
    fi
}

# Function to save configuration to file
save_config() {
    local config="$1"
    local filename="$2"
    
    echo "$config" > "$filename"
    echo -e "${GREEN}${BOLD}✅ Configuration saved to ${filename}${RESET}"
}

# Function to copy to clipboard (if available)
copy_to_clipboard() {
    local config="$1"
    
    if command -v xclip &> /dev/null; then
        echo "$config" | xclip -selection clipboard
        echo -e "${GREEN}${BOLD}✅ Configuration copied to clipboard${RESET}"
    elif command -v pbcopy &> /dev/null; then
        echo "$config" | pbcopy
        echo -e "${GREEN}${BOLD}✅ Configuration copied to clipboard${RESET}"
    elif command -v clip.exe &> /dev/null; then
        echo "$config" | clip.exe
        echo -e "${GREEN}${BOLD}✅ Configuration copied to clipboard${RESET}"
    else
        echo -e "${YELLOW}Unable to copy to clipboard - clipboard tool not found.${RESET}"
    fi
}

# Function to generate MCP JSON configuration
generate_config() {
    echo -e "${CYAN}${BOLD}Generate MCP Configuration${RESET}\n"
    echo -e "This will create a configuration for your mcp.json file.\n"

    # Ask user which storage mode they want to use
    echo -e "${CYAN}${BOLD}Choose Storage Mode:${RESET}"
    echo -e "1. ${BOLD}Cloud Storage${RESET} (Mem0.ai API - persistent, requires Mem0 API key)"
    echo -e "2. ${BOLD}Local Storage${RESET} (In-memory - temporary, requires OpenAI API key)"
    echo -ne "\n${CYAN}Choose an option (1-2):${RESET} "
    read storage_choice
    echo
    
    # Default to cloud storage if invalid choice
    if [ "$storage_choice" != "2" ]; then
        storage_choice="1"
    fi
    
    # Get API keys based on storage choice
    if [ "$storage_choice" == "1" ]; then
        echo -e "${CYAN}Mem0 API Key (required for cloud storage):${RESET}"
        read -s MEM0_API_KEY
        echo
        
        if [ -z "$MEM0_API_KEY" ]; then
            echo -e "${RED}Error: Mem0 API Key is required for cloud storage.${RESET}"
            return 1
        fi
        
        # Optionally get OpenAI API Key as backup
        echo -e "${CYAN}OpenAI API Key (optional, for fallback to local storage):${RESET}"
        read -s OPENAI_API_KEY
        echo
    else
        echo -e "${CYAN}OpenAI API Key (required for local storage):${RESET}"
        read -s OPENAI_API_KEY
        echo
        
        if [ -z "$OPENAI_API_KEY" ]; then
            echo -e "${RED}Error: OpenAI API Key is required for local storage.${RESET}"
            return 1
        fi
        
        # Optionally get Mem0 API Key for future use
        echo -e "${CYAN}Mem0 API Key (optional, for future use with cloud storage):${RESET}"
        read -s MEM0_API_KEY
        echo
    fi

    # Get User ID
    echo -e "${CYAN}Default User ID (e.g., 'username', 'project-name'):${RESET}"
    read DEFAULT_USER_ID
    if [ -z "$DEFAULT_USER_ID" ]; then
        DEFAULT_USER_ID="user"
    fi

    # Get Session ID
    echo -e "${CYAN}Session ID (e.g., 'coding-session', 'project-xyz'):${RESET}"
    echo -e "${YELLOW}Note: This is optional and helps organize memories within a user's account${RESET}"
    echo -e "${YELLOW}      (Mem0 API uses this as 'run_id' internally)${RESET}"
    read SESSION_ID
    
    # Ask if they want to use local build or npm package
    echo -e "${CYAN}${BOLD}Installation Method:${RESET}"
    echo -e "1. ${BOLD}Local Build${RESET} (Use if you've cloned the repository and built it)"
    echo -e "2. ${BOLD}NPM Package${RESET} (Use npx to run the published package - recommended)"
    echo -ne "\n${CYAN}Choose an option (1-2):${RESET} "
    read install_method
    echo
    
    # Default to NPM package if invalid choice
    if [ "$install_method" != "1" ]; then
        install_method="2"
    fi
    
    # Get the current directory where the script is running
    CURRENT_DIR=$(pwd)
    
    # Generate a complete mcp.json configuration
    echo -e "\n${YELLOW}${BOLD}Configuration for mcp.json:${RESET}\n"
    
    # Create the environment variables section based on chosen configuration
    ENV_SECTION="{"
    
    # Add API keys based on chosen storage mode
    if [ -n "$MEM0_API_KEY" ]; then
        ENV_SECTION="${ENV_SECTION}
        \"MEM0_API_KEY\": \"${MEM0_API_KEY}\","
    fi
    
    if [ -n "$OPENAI_API_KEY" ]; then
        ENV_SECTION="${ENV_SECTION}
        \"OPENAI_API_KEY\": \"${OPENAI_API_KEY}\","
    fi
    
    # Add user ID and session ID
    ENV_SECTION="${ENV_SECTION}
        \"DEFAULT_USER_ID\": \"${DEFAULT_USER_ID}\""
    
    if [ -n "$SESSION_ID" ]; then
        # For cloud storage (Mem0 API), use RUN_ID
        if [ "$storage_choice" == "1" ]; then
            ENV_SECTION="${ENV_SECTION},
            \"RUN_ID\": \"${SESSION_ID}\""
        else
            # For local storage, use SESSION_ID
            ENV_SECTION="${ENV_SECTION},
            \"SESSION_ID\": \"${SESSION_ID}\""
        fi
    fi
    
    # Close the environment section
    ENV_SECTION="${ENV_SECTION}
      }"
    
    # Create command and args based on installation method
    if [ "$install_method" == "1" ]; then
        # Local build
        COMMAND="node"
        ARGS="[
        \"${CURRENT_DIR}/build/index.js\"
      ]"
    else
        # NPM package
        COMMAND="npx"
        ARGS="[
        \"-y\",
        \"@pinkpixel/mem0-mcp\"
      ]"
    fi
    
    # Construct the full configuration
    CONFIG=$(cat << EOF
{
  "mcpServers": {
    "mem0-mcp": {
      "command": "${COMMAND}",
      "args": ${ARGS},
      "env": ${ENV_SECTION},
      "disabled": false,
      "alwaysAllow": [
        "add_memory",
        "search_memory"
      ]
    }
  }
}
EOF
)

    # Display the configuration with syntax highlighting
    echo -e "${BLUE}${CONFIG}${RESET}\n"
    
    # Ask what the user wants to do with the configuration
    echo -e "${CYAN}${BOLD}What would you like to do with this configuration?${RESET}"
    echo -e "1. ${BOLD}Save to .cursor/mcp.json${RESET} (for Cursor IDE)"
    echo -e "2. ${BOLD}Save to a custom file${RESET}"
    echo -e "3. ${BOLD}Copy to clipboard${RESET}"
    echo -e "4. ${BOLD}Just show it (do nothing)${RESET}"
    echo -ne "\n${CYAN}Choose an option (1-4):${RESET} "
    read config_action
    echo
    
    case $config_action in
        1)
            # Save to .cursor/mcp.json
            mkdir -p ~/.cursor
            save_config "$CONFIG" ~/.cursor/mcp.json
            ;;
        2)
            # Save to custom file
            echo -e "${CYAN}Enter filename to save to:${RESET}"
            read custom_filename
            if [ -z "$custom_filename" ]; then
                custom_filename="mcp.json"
            fi
            save_config "$CONFIG" "$custom_filename"
            ;;
        3)
            # Copy to clipboard
            copy_to_clipboard "$CONFIG"
            ;;
        *)
            # Just show it (already displayed above)
            echo -e "${GREEN}${BOLD}✅ Configuration displayed above${RESET}"
            ;;
    esac
}

# Function to restart the Mem0-MCP server if it's running
restart_mem0_mcp() {
    echo -e "${CYAN}${BOLD}Restarting Mem0-MCP Server...${RESET}\n"
    
    # Check if the server is running
    PID=$(pgrep -f "mem0-mcp|build/index.js")
    
    if [ -n "$PID" ]; then
        echo -e "${YELLOW}Found running Mem0-MCP process (PID: $PID). Stopping...${RESET}"
        kill $PID
        sleep 1
        
        # Check if process was stopped
        if kill -0 $PID 2>/dev/null; then
            echo -e "${RED}Process is still running. Forcing termination...${RESET}"
            kill -9 $PID
            sleep 1
        fi
        
        echo -e "${GREEN}Process stopped.${RESET}"
    else
        echo -e "${YELLOW}No running Mem0-MCP process found.${RESET}"
    fi
    
    # Ask how to start the server
    echo -e "\n${CYAN}${BOLD}How would you like to start Mem0-MCP?${RESET}"
    echo -e "1. ${BOLD}Use local build${RESET} (node build/index.js)"
    echo -e "2. ${BOLD}Use npm package${RESET} (npx -y @pinkpixel/mem0-mcp)"
    echo -ne "\n${CYAN}Choose an option (1-2):${RESET} "
    read start_method
    echo
    
    # Set environment variables
    echo -e "${CYAN}${BOLD}Enter environment variables (leave empty to skip):${RESET}"
    
    echo -e "${CYAN}Mem0 API Key (for cloud storage):${RESET}"
    read -s MEM0_API_KEY
    echo
    
    echo -e "${CYAN}OpenAI API Key (for local storage):${RESET}"
    read -s OPENAI_API_KEY
    echo
    
    echo -e "${CYAN}Default User ID:${RESET}"
    read DEFAULT_USER_ID
    
    echo -e "${CYAN}Session ID/Run ID:${RESET}"
    echo -e "${YELLOW}(Mem0 API uses this as 'run_id' internally)${RESET}"
    read SESSION_ID
    
    # Run the server based on selected method
    if [ "$start_method" == "1" ]; then
        # Local build
        echo -e "${GREEN}Starting Mem0-MCP from local build...${RESET}"
        
        # Build the command with environment variables
        cmd="node build/index.js"
        
        if [ -n "$MEM0_API_KEY" ]; then
            cmd="MEM0_API_KEY=$MEM0_API_KEY $cmd"
        fi
        
        if [ -n "$OPENAI_API_KEY" ]; then
            cmd="OPENAI_API_KEY=$OPENAI_API_KEY $cmd"
        fi
        
        if [ -n "$DEFAULT_USER_ID" ]; then
            cmd="DEFAULT_USER_ID=$DEFAULT_USER_ID $cmd"
        fi
        
        if [ -n "$SESSION_ID" ]; then
            # Set both SESSION_ID and RUN_ID to ensure compatibility
            cmd="SESSION_ID=$SESSION_ID RUN_ID=$SESSION_ID $cmd"
        fi
        
        # Run in background
        eval "$cmd &"
        echo -e "${GREEN}Mem0-MCP started with PID: $!${RESET}"
    else
        # NPM package
        echo -e "${GREEN}Starting Mem0-MCP from npm package...${RESET}"
        
        # Build the command with environment variables
        cmd="npx -y @pinkpixel/mem0-mcp"
        
        if [ -n "$MEM0_API_KEY" ]; then
            cmd="MEM0_API_KEY=$MEM0_API_KEY $cmd"
        fi
        
        if [ -n "$OPENAI_API_KEY" ]; then
            cmd="OPENAI_API_KEY=$OPENAI_API_KEY $cmd"
        fi
        
        if [ -n "$DEFAULT_USER_ID" ]; then
            cmd="DEFAULT_USER_ID=$DEFAULT_USER_ID $cmd"
        fi
        
        if [ -n "$SESSION_ID" ]; then
            # Set both SESSION_ID and RUN_ID to ensure compatibility
            cmd="SESSION_ID=$SESSION_ID RUN_ID=$SESSION_ID $cmd"
        fi
        
        # Run in background
        eval "$cmd &"
        echo -e "${GREEN}Mem0-MCP started with PID: $!${RESET}"
    fi
}

# Main function - show menu and handle user selection
main() {
    show_banner

    while true; do
        echo -e "${CYAN}${BOLD}Mem0-MCP Management Menu${RESET}\n"
        echo -e "1. ${BOLD}Generate mcp.json Config${RESET}"
        echo -e "2. ${BOLD}View README.md${RESET}"
        echo -e "3. ${BOLD}Restart Mem0-MCP Server${RESET}"
        echo -e "4. ${BOLD}Exit${RESET}"
        
        echo -ne "\n${CYAN}Choose an option (1-4):${RESET} "
        read choice
        echo
        
        case $choice in
            1) generate_config ;;
            2) view_readme ;;
            3) restart_mem0_mcp ;;
            4) echo -e "${GREEN}Goodbye!${RESET}"; exit 0 ;;
            *) echo -e "${RED}Invalid option. Please try again.${RESET}\n" ;;
        esac
        
        echo -e "\nPress Enter to return to menu..."
        read
        clear
        show_banner
    done
}

# Run the main function
main 