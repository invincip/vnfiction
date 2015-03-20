#!/usr/bin/env ruby
# encoding: UTF-8
require 'mechanize'
require 'parallel'
require 'json'
require 'fileutils'

agent = Mechanize.new

# Log-in
puts "Logging in..."
agent.post 'http://vnfiction.com/forums/index.php?action=login2', user: 'herophuong', passwrd: 'herozero', cookielength: -1

# Get links
offsets = (0..3330).to_a.keep_if{|n| n % 30 == 0}
catalog = Parallel.map(offsets, progress: "Collecting catalog...", in_threads: 8) do |offset|
  begin
    tries ||= 3
    page = agent.get 'http://vnfiction.com/browse.php?type=titles&offset=' + offset.to_s
    page.search("table.listbox").map do |box|
      link = box/".title > a"
      sid = link.attr("href").to_s.match(/sid=(\d*)/)[1]
      name = link.text
      author = (box/".title .small a").text
      stats = (box/".contlist .small:last-child").text
      (box/".contlist .small:last-child").remove # Remove stats from abstract
      (box/".contlist br:last-child").remove
      (box/".contlist br:last-child").remove
      abstract = (box/".contlist").inner_html
      
      # Extract stats
      if stats.match(/Rating:\s(\w+)\s/)
        rating = stats.match(/Rating:\s(\w+)\s/)[1]
      else
        rating = nil
      end
      if stats.match(/Hoàn thành:\s*(\p{L}+)\s*/)
        completed = stats.match(/Hoàn thành:\s*(\p{L}+)\s*/)[1]
      else
        completed = nil
      end
      if stats.match(/Phân đoạn:\s*(\d+)\s*/)
        chapters = stats.match(/Phân đoạn:\s*(\d+)\s*/)[1].to_i
      else
        chapters = nil
      end
      if stats.match(/Độ dài:\s*(\d+)\s*/)
        length = stats.match(/Độ dài:\s*(\d+)\s*/)[1].to_i
      else
        length = nil
      end
      if stats.match(/Đọc:\s*(\d+)\s*/)
        read_count = stats.match(/Đọc:\s*(\d+)\s*/)[1].to_i
      else
        read_count = nil
      end

      {
        sid: sid,
        name: name,
        author: author,
        abstract: abstract,
        stats: {
          chapters: chapters,
          rating: rating,
          completed: completed,
          length: length,
          read: read_count
        }
      }
    end
  rescue Exception => e
    puts "Error at offset #{offset}: #{e.to_s} at #{e.backtrace[0]}. Retrying..."
    retry unless (tries -= 1).zero?
    puts "Failed at offset #{offset}"
    []
  end
end.reduce(:+)

# Save catalog
File.write('catalog.json', JSON.pretty_generate(catalog))

Parallel.each(catalog, progress: "Downloading stories...", in_threads: 8) do |story|
  sid = story[:sid]
  last_chapter_selector = "select[name='chapter'] option:last-child"
  container_selector = "table.listbox:nth-child(3) .contlist span"

  # Ignore downloaded stories
#   next if File.exists?("partials/#{sid}.html")
  
  # Get first chapter
  page = agent.get "http://vnfiction.com/viewstory.php?sid=#{sid}"
  File.write("partials/#{sid}.html.part", (page/container_selector).inner_html)

  # Get number of chapters
  begin
    number_of_chapters = (page/last_chapter_selector).attr("value").to_s.to_i
  rescue
    number_of_chapters = 1
  end

  # Download other chapters
  if number_of_chapters > 2
    (2..number_of_chapters).each do |c|
      page = agent.get "http://vnfiction.com/viewstory.php?sid=#{sid}&chapter=#{c}"
      open("partials/#{sid}.html.part", "a") do |f|
        f.puts "<br /><!-- chapter #{c} --><br />"
        f.puts (page/container_selector).inner_html
      end
    end
  end
  
  # Complete download
  FileUtils.mv "partials/#{sid}.html.part", "partials/#{sid}.html"
end