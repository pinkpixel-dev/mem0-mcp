Features
Multimodal Support
Mem0 extends its capabilities beyond text by supporting multimodal data, including images. Users can seamlessly integrate images into their interactions, allowing Mem0 to extract pertinent information from visual content and enrich the memory system.

​
How It Works
When a user provides an image, Mem0 processes the image to extract textual information and relevant details, which are then added to the user’s memory. This feature enhances the system’s ability to understand and remember details based on visual inputs.

To enable multimodal support, you must set enable_vision = True in your configuration. The vision_details parameter can be set to “auto” (default), “low”, or “high” to control the level of detail in image processing.


Code

TypeScript

Output

Copy
from mem0 import Memory

config = {
    "llm": {
        "provider": "openai",
        "config": {
            "enable_vision": True,
            "vision_details": "high"
        }
    }
}

client = Memory.from_config(config=config)

messages = [
    {
        "role": "user",
        "content": "Hi, my name is Alice."
    },
    {
        "role": "assistant",
        "content": "Nice to meet you, Alice! What do you like to eat?"
    },
    {
        "role": "user",
        "content": {
            "type": "image_url",
            "image_url": {
                "url": "https://www.superhealthykids.com/wp-content/uploads/2021/10/best-veggie-pizza-featured-image-square-2.jpg"
            }
        }
    },
]

# Calling the add method to ingest messages into the memory system
client.add(messages, user_id="alice")
​
Image Integration Methods
Mem0 allows you to add images to user interactions through two primary methods: by providing an image URL or by using a Base64-encoded image. Below are examples demonstrating each approach.

​
1. Using an Image URL (Recommended)
You can include an image by passing its direct URL. This method is simple and efficient for online images.



TypeScript

Copy
# Define the image URL
image_url = "https://www.superhealthykids.com/wp-content/uploads/2021/10/best-veggie-pizza-featured-image-square-2.jpg"

# Create the message dictionary with the image URL
image_message = {
    "role": "user",
    "content": {
        "type": "image_url",
        "image_url": {
            "url": image_url
        }
    }
}
​
2. Using Base64 Image Encoding for Local Files
For local images or scenarios where embedding the image directly is preferable, you can use a Base64-encoded string.


Python

TypeScript

Copy
import base64

# Path to the image file
image_path = "path/to/your/image.jpg"

# Encode the image in Base64
with open(image_path, "rb") as image_file:
    base64_image = base64.b64encode(image_file.read()).decode("utf-8")

# Create the message dictionary with the Base64-encoded image
image_message = {
    "role": "user",
    "content": {
        "type": "image_url",
        "image_url": {
            "url": f"data:image/jpeg;base64,{base64_image}"
        }
    }
}
​
3. OpenAI-Compatible Message Format
You can also use the OpenAI-compatible format to combine text and images in a single message:


Python

TypeScript

Copy
import base64

# Path to the image file
image_path = "path/to/your/image.jpg"

# Encode the image in Base64
with open(image_path, "rb") as image_file:
    base64_image = base64.b64encode(image_file.read()).decode("utf-8")

# Create the message using OpenAI-compatible format
message = {
    "role": "user",
    "content": [
        {
            "type": "text",
            "text": "What is in this image?",
        },
        {
            "type": "image_url",
            "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"},
        },
    ],
}

# Add the message to memory
client.add([message], user_id="alice")
This format allows you to combine text and images in a single message, making it easier to provide context along with visual content.

By utilizing these methods, you can effectively incorporate images into user interactions, enhancing the multimodal capabilities of your Mem0 instance.