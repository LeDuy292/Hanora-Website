using Services.DTOs;
using System.Collections.Generic;
using System.Linq;

namespace Services;

public interface ILayoutAnalysisService
{
    List<PageBlocksDto> AnalyzeLayout(List<PageLinesDto> pages);
}

public class LayoutAnalysisService : ILayoutAnalysisService
{
    public List<PageBlocksDto> AnalyzeLayout(List<PageLinesDto> pages)
    {
        var result = new List<PageBlocksDto>();

        foreach (var page in pages)
        {
            var pageBlock = new PageBlocksDto { PageNumber = page.PageNumber };
            var blocks = new List<DocumentBlockDto>();

            if (page.Lines == null || !page.Lines.Any())
            {
                result.Add(pageBlock);
                continue;
            }

            var lines = page.Lines.ToList();
            
            // Calculate median height to detect headings
            var heights = lines.Where(l => l.Height.HasValue && l.Height > 0).Select(l => l.Height!.Value).OrderBy(h => h).ToList();
            double medianHeight = heights.Any() ? heights[heights.Count / 2] : 10;
            
            // Identify paragraphs based on vertical gap (assuming lines are sorted top-to-bottom)
            var currentBlock = new DocumentBlockDto();
            double? previousY = null;
            double? previousHeight = null;

            foreach (var line in lines)
            {
                bool isNewBlock = false;
                string blockType = "paragraph";
                
                // If it's much taller than median, it's a heading
                if (line.Height.HasValue && line.Height.Value > medianHeight * 1.3)
                {
                    blockType = line.Height.Value > medianHeight * 1.8 ? "heading1" : "heading2";
                    isNewBlock = true;
                }
                else if (previousY.HasValue && previousHeight.HasValue)
                {
                    // Check vertical gap between lines.
                    // If the gap is larger than 1.5x the line height, consider it a new paragraph.
                    // Note: Depending on coordinate system (top-down or bottom-up), the gap is absolute difference.
                    double gap = System.Math.Abs(line.Y.GetValueOrDefault() - previousY.Value) - previousHeight.Value;
                    
                    if (gap > previousHeight.Value * 0.5) // gap is larger than half a line height -> new paragraph
                    {
                        isNewBlock = true;
                    }
                }

                if (isNewBlock && currentBlock.Lines.Any())
                {
                    blocks.Add(currentBlock);
                    currentBlock = new DocumentBlockDto();
                }

                currentBlock.Type = blockType;
                currentBlock.Lines.Add(line);
                
                previousY = line.Y;
                previousHeight = line.Height;
            }

            if (currentBlock.Lines.Any())
            {
                blocks.Add(currentBlock);
            }

            // Post-process blocks: populate Text and Words
            foreach (var block in blocks)
            {
                var blockText = string.Join("\n", block.Lines.Select(l => l.Text));
                block.Text = blockText;

                int charIndex = 0;
                foreach (var line in block.Lines)
                {
                    foreach (var word in line.Words)
                    {
                        // find word position in line
                        int idx = line.Text.IndexOf(word.Text, System.StringComparison.OrdinalIgnoreCase);
                        if (idx >= 0)
                        {
                            block.Words.Add(new WordRefDto
                            {
                                Text = word.Text,
                                CharStart = charIndex + idx,
                                CharEnd = charIndex + idx + word.Text.Length
                            });
                        }
                    }
                    charIndex += line.Text.Length + 1; // +1 for newline
                }
            }

            pageBlock.Blocks = blocks;
            result.Add(pageBlock);
        }

        return result;
    }
}
